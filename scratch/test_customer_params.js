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

async function probe(endpoint, param, val) {
  const path = `${endpoint}?limit=1&${param}=${encodeURIComponent(val)}`;
  const r = await get(path);
  const ok = r.status >= 200 && r.status < 300;
  const msg = !ok ? (Array.isArray(r.data?.message) ? r.data.message.join(', ') : r.data?.message || r.data?.error || r.error || '') : 'SUCCESS';
  console.log(`[${ok ? 'OK ' : 'ERR'}] ${r.status} | Endpoint: ${endpoint} | Param: ${param} | Msg: ${msg}`);
}

(async () => {
  const endpoints = [
    '/user-service/admin/customers',
    '/user-service/admin/waitlist',
    '/user-service/admin/customers/pending-verification'
  ];

  const params = [
    { name: 'status', val: 'active' },
    { name: 'status', val: 'pending' },
    { name: 'medium', val: 'invite_code' },
    { name: 'score', val: '100' },
    { name: 'cityId', val: '123456789012345678' },
    { name: 'city', val: 'London' },
    { name: 'country', val: 'UK' },
    { name: 'search', val: 'John' },
    { name: 'isActive', val: 'true' }
  ];

  console.log('--- PROBING CUSTOMERS / WAITLIST / VERIFICATION ---');
  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`);
    for (const p of params) {
      // Adjust standard values if needed per endpoint
      let val = p.val;
      if (endpoint.includes('waitlist') && p.name === 'status' && val === 'active') {
        val = 'pending';
      }
      if (endpoint.includes('pending-verification') && p.name === 'status' && val === 'active') {
        val = 'pending';
      }
      await probe(endpoint, p.name, val);
    }
  }
})();
