const http = require('http');
const BASE = 'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api';

function get(path) {
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

async function probe(param, val) {
  const path = `/user-service/admin/users?limit=1&${param}=${encodeURIComponent(val)}`;
  const r = await get(path);
  const ok = r.status >= 200 && r.status < 300;
  const msg = !ok ? (Array.isArray(r.data?.message) ? r.data.message.join(', ') : r.data?.message || r.data?.error || r.error || '') : 'SUCCESS';
  console.log(`[${ok ? 'OK ' : 'ERR'}] ${r.status} | Param: ${param} | Msg: ${msg}`);
}

(async () => {
  console.log('--- PROBING ADMIN USERS ENDPOINT ---');
  await probe('status', 'active');
  await probe('status', 'inactive');
  await probe('status', 'pending');
  await probe('role', 'admin');
  await probe('role', 'super_admin');
  await probe('search', 'admin');
  await probe('isActive', 'true');
})();
