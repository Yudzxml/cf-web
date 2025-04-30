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
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
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

function getRootDomain(domain) {
  const parts = domain.split('.');
  return parts.slice(-2).join('.');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const { domain, type } = JSON.parse(body);
      if (!domain || !type) return res.status(400).json({ message: 'domain and type are required' });

      const rootDomain = getRootDomain(domain);
      const zones = await requestCloudflare(`/client/v4/zones?name=${rootDomain}`, 'GET');
      if (!zones.success || !zones.result.length)
        return res.status(404).json({ message: 'Zone not found' });

      const zoneId = zones.result[0].id;

      const records = await requestCloudflare(`/client/v4/zones/${zoneId}/dns_records?name=${domain}&type=${type}`, 'GET');
      if (!records.success || records.result.length === 0)
        return res.status(404).json({ message: 'No matching record found' });

      const recordId = records.result[0].id;

      const deleted = await requestCloudflare(`/client/v4/zones/${zoneId}/dns_records/${recordId}`, 'DELETE');
      if (deleted.success) {
        return res.status(200).json({ message: `DNS record ${type} for ${domain} deleted.` });
      } else {
        return res.status(500).json({ message: 'Failed to delete', errors: deleted.errors });
      }
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  });
};
