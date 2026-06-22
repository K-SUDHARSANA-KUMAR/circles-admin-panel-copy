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

async function probe(path) {
  const r = await get(path);
  const ok = r.status >= 200 && r.status < 300;
  const msg = !ok ? (Array.isArray(r.data?.message) ? r.data.message.join(', ') : r.data?.message || r.data?.error || r.error || '') : 'SUCCESS';
  console.log(`[${ok ? 'OK ' : 'ERR'}] ${r.status} | Path: ${path} | Msg: ${msg}`);
}

(async () => {
  const candidates = [
    'cityId',
    'countryId',
    'status',
    'isActive',
    'visible',
    'featured',
    'is_visible',
    'is_featured',
    'popularity',
    'sort',
    'order',
    'sortBy',
    'sortOrder',
    'name',
    'city',
    'country',
    'countryCode'
  ];

  console.log('--- PROBING VENUES ENDPOINT PARAMETERS ---');
  for (const param of candidates) {
    // We send a dummy value that is a valid snowflake/UUID or standard type depending on param name
    let val = '123456789012345678'; // dummy snowflake
    if (param === 'isActive' || param === 'visible' || param === 'featured' || param === 'is_visible' || param === 'is_featured') {
      val = 'true';
    }
    await probe(`/user-service/venues?limit=1&${param}=${val}`);
  }
})();
