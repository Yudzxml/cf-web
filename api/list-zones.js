const https = require('https');
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

function requestCloudflare(path, method) {
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
    req.end();
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const zones = await requestCloudflare(`/client/v4/zones`, 'GET');
    if (!zones.success) return res.status(500).json({ message: 'Failed to fetch zones' });

    const result = zones.result.map(z => ({
      id: z.id,
      name: z.name,
      status: z.status
    }));

    return res.status(200).json({ result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};