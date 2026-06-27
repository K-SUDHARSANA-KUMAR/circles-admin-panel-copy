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

(async () => {
  // Query countries with search=Egypt
  const r1 = await get('/user-service/countries?limit=10&search=Egypt');
  console.log('Search Egypt Status:', r1.status);
  console.log('Search Egypt Result count:', r1.data?.result?.data?.items?.length ?? r1.data?.data?.items?.length ?? 0);
  console.log('Search Egypt Body:', JSON.stringify(r1.data, null, 2));

  // Query countries with search=EG
  const r2 = await get('/user-service/countries?limit=10&search=EG');
  console.log('\nSearch EG Status:', r2.status);
  console.log('Search EG Result count:', r2.data?.result?.data?.items?.length ?? r2.data?.data?.items?.length ?? 0);
  
  // List all countries to see if Egypt is in the list
  const r3 = await get('/user-service/countries?limit=250');
  const list = r3.data?.result?.data?.items ?? r3.data?.data?.items ?? [];
  const egypt = list.find(c => c.name.toLowerCase().includes('egypt') || c.code.toLowerCase() === 'eg');
  console.log('\nEgypt in list?', egypt ? JSON.stringify(egypt) : 'NO');
})();
