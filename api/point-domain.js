const https = require('https');

const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_TOKEN;

function requestCloudflare(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error('Invalid JSON'));
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

module.exports = async (req, res) => {
  if (!CLOUDFLARE_API_TOKEN) {
    console.error('Missing CLOUDFLARE_TOKEN');
    return res.status(500).json({ message: 'Missing Cloudflare API Token' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { domain, type, content, ttl, priority, proxied } = req.body;

    if (!domain || !type || !content) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Ambil semua zone
    const zones = await requestCloudflare('/client/v4/zones', 'GET');
    if (!zones.success || !Array.isArray(zones.result)) {
      console.error('Gagal ambil zone:', zones);
      return res.status(500).json({ message: 'Gagal mengambil daftar zone.' });
    }

    const matchedZone = zones.result.find(z => domain.endsWith(z.name));
    if (!matchedZone) {
      return res.status(404).json({ message: `Zone tidak ditemukan untuk domain ${domain}` });
    }

    const zoneId = matchedZone.id;
    const recordData = {
      type,
      name: domain,
      content,
      ttl,
      proxied,
    };

    if (type === 'MX' && priority) {
      recordData.priority = priority;
    }

    const result = await requestCloudflare(`/client/v4/zones/${zoneId}/dns_records`, 'POST', recordData);

    if (result.success) {
      return res.status(200).json({ message: `DNS record ${type} untuk ${domain} berhasil dibuat.` });
    } else {
      console.error('Cloudflare error:', result.errors);
      return res.status(500).json({ message: 'Gagal membuat DNS record.', errors: result.errors });
    }
  } catch (err) {
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Aktifkan body parser
export const config = {
  api: {
    bodyParser: true,
  },
};