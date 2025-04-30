// Load available zones on page load
window.addEventListener('DOMContentLoaded', async () => {
  const zoneSelector = document.getElementById('zoneSelector');
  try {
    const res = await fetch('/api/zones');
    const { zones } = await res.json();

    zoneSelector.innerHTML = zones.length
      ? zones.map(z => `<option value="${z.name}">${z.name}</option>`).join('')
      : '<option disabled>No zones found</option>';
  } catch (err) {
    zoneSelector.innerHTML = '<option disabled>Error loading zones</option>';
  }
});

// Combine selected zone and subdomain into full domain
document.getElementById('subdomainInput').addEventListener('input', updateDomain);
document.getElementById('zoneSelector').addEventListener('change', updateDomain);

function updateDomain() {
  const sub = document.getElementById('subdomainInput').value.trim();
  const zone = document.getElementById('zoneSelector').value;
  const full = sub ? `${sub}.${zone}` : zone;
  document.getElementById('domain').value = full;
}

// Event listener untuk form submit
document.getElementById('dnsForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const domain = document.getElementById('domain').value;
  const type = document.getElementById('type').value;
  const content = document.getElementById('content').value;
  const ttl = parseInt(document.getElementById('ttl').value, 10);
  const priority = parseInt(document.getElementById('priority').value, 10);
  const proxied = document.getElementById('proxied').checked;

  const body = { domain, type, content, ttl, proxied };
  if (type === 'MX' && !isNaN(priority)) body.priority = priority;

  const res = await fetch('/api/point-domain', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await res.json();
  document.getElementById('result').textContent = result.message;
  document.getElementById('result').classList.add('text-indigo-600');
});

// Fungsi untuk menampilkan DNS records
async function listRecords() {
  const domain = document.getElementById('searchDomain').value;
  if (!domain) return alert('Please enter a domain');

  const res = await fetch('/api/list-records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });

  const data = await res.json();
  const container = document.getElementById('records');
  container.innerHTML = '';

  if (!data.result || data.result.length === 0) {
    container.innerHTML = '<div class="text-center text-gray-600">No DNS records found.</div>';
    return;
  }

  data.result.forEach(record => {
    const div = document.createElement('div');
    div.className = "bg-gray-100 p-4 rounded-lg shadow-md flex justify-between items-center space-x-4 transition transform hover:scale-105";
    div.innerHTML = `
      <div>
        <strong class="text-indigo-700">${record.type}</strong> ${record.name} → ${record.content}
        ${record.priority ? `(Priority: ${record.priority})` : ""}
      </div>
      <button class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs transition duration-300" onclick="deleteRecord('${record.name}', '${record.type}')">Delete</button>
    `;
    container.appendChild(div);
  });
}

// Fungsi untuk menghapus DNS record
async function deleteRecord(domain, type) {
  const confirmDelete = confirm(`Are you sure you want to delete ${type} record for ${domain}?`);
  if (!confirmDelete) return;

  const res = await fetch('/api/delete-record', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain, type }),
  });

  const result = await res.json();
  alert(result.message);
  listRecords(); // Refresh the list
}

// Load domain zones on page load
window.addEventListener('DOMContentLoaded', fetchZones);

// Ambil semua domain dari API
async function fetchZones() {
  const res = await fetch('/api/list-zones'); // Buat endpoint list-zones.js seperti tadi
  const data = await res.json();
  const table = document.getElementById('domainTable');
  table.innerHTML = '';

  if (!data.result || data.result.length === 0) {
    table.innerHTML = '<tr><td colspan="3" class="p-2 text-center text-gray-600">Tidak ada domain ditemukan.</td></tr>';
    return;
  }

  data.result.forEach(zone => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2 border">${zone.name}</td>
      <td class="p-2 border">${zone.status}</td>
      <td class="p-2 border">
        <button onclick="viewRecords('${zone.name}')" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">Lihat Subdomain</button>
      </td>
    `;
    table.appendChild(row);
  });
}

// Tampilkan semua record untuk domain
async function viewRecords(domain) {
  const res = await fetch('/api/list-records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain }),
  });

  const data = await res.json();
  const table = document.getElementById('recordTable');
  table.innerHTML = '';

  if (!data.result || data.result.length === 0) {
    table.innerHTML = '<tr><td colspan="5" class="p-2 text-center text-gray-600">Tidak ada record ditemukan.</td></tr>';
    return;
  }

  data.result.forEach(record => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-2 border">${record.type}</td>
      <td class="p-2 border">${record.name}</td>
      <td class="p-2 border">${record.content}</td>
      <td class="p-2 border">${record.ttl}</td>
      <td class="p-2 border">
        <button onclick="deleteRecord('${record.name}', '${record.type}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs">Hapus</button>
      </td>
    `;
    table.appendChild(row);
  });
}