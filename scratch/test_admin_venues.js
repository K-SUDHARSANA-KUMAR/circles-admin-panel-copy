const http = require('http');

const BASE = 'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api';

async function get(path) {
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const options = {
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Api-Key': 'local-admin-key-123',
      },
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

async function probe(label, path) {
  const r = await get(path);
  const ok = r.status >= 200 && r.status < 300;
  const msg = !ok ? (Array.isArray(r.data?.message) ? r.data.message.join(', ') : r.data?.message || r.data?.error || r.error || '') : 'SUCCESS';
  console.log(`[${ok ? 'OK ' : 'ERR'}] ${r.status} | ${label} | Path: ${path} | Msg: ${msg}`);
}

(async () => {
  console.log('--- PROBING ADMIN VENUES ---');
  await probe('Admin Venues: base', '/user-service/admin/venues?limit=5');
  await probe('Admin Venues: name=Test', '/user-service/admin/venues?limit=5&name=Test');
  await probe('Admin Venues: city=London', '/user-service/admin/venues?limit=5&city=London');
  await probe('Admin Venues: country=UK', '/user-service/admin/venues?limit=5&country=UK');
  await probe('Admin Venues: isVisible=true', '/user-service/admin/venues?limit=5&isVisible=true');
  await probe('Admin Venues: isFeatured=true', '/user-service/admin/venues?limit=5&isFeatured=true');
  await probe('Admin Venues: popularityScore=50', '/user-service/admin/venues?limit=5&popularityScore=50');
})();
