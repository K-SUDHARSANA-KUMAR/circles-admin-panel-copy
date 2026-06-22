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
  const r = await get('/user-service/countries?limit=250');
  const items = r.data?.data?.items ?? [];
  const totalItems = r.data?.data?.totalItems;
  console.log('Total items in DB:', totalItems);
  console.log('Items returned in list:', items.length);
  if (items.length > 0) {
    console.log('First country:', items[0].name);
    console.log('Last country returned:', items[items.length - 1].name);
  }
})();
