const https = require('https');
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_TOKEN;

function fetchZones() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.cloudflare.com',
      path: '/client/v4/zones',
      method: 'GET',
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
          const json = JSON.parse(body);
          if (json.success) resolve(json.result);
          else reject(new Error('Cloudflare API Error'));
        } catch {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });
  try {
    const zones = await fetchZones();
    res.status(200).json({ zones });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch zones' });
  }
};