const http = require('http');

const BASE = 'http://ec2-13-48-49-25.eu-north-1.compute.amazonaws.com/api';
const TOKEN = ''; // Leave empty if not logged in, but let's send X-Admin-Api-Key which is what the admin service uses

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
  if (ok && r.data) {
    // Print a snippet of results or total count if available
    const items = r.data?.result?.data?.items ?? r.data?.data?.items ?? r.data?.items ?? r.data?.result?.data ?? r.data?.data ?? r.data;
    console.log(`         → Count/Type: ${Array.isArray(items) ? items.length : typeof items}`);
  }
}

(async () => {
  console.log('--- PROBING CITIES ---');
  await probe('Cities: base', '/user-service/cities?limit=5');
  await probe('Cities: countryCode=MX', '/user-service/cities?limit=5&countryCode=MX');
  await probe('Cities: countryCode=MX & limit=10 & skip=0', '/user-service/cities?limit=10&skip=0&countryCode=MX');
  await probe('Cities: country=Mexico', '/user-service/cities?limit=5&country=Mexico');
  await probe('Cities: city=Aachen', '/user-service/cities?limit=5&city=Aachen');
  await probe('Cities: status=Active', '/user-service/cities?limit=5&status=Active');
  await probe('Cities: status=active', '/user-service/cities?limit=5&status=active');
  await probe('Cities: isActive=true', '/user-service/cities?limit=5&isActive=true');

  console.log('\n--- PROBING COUNTRIES ---');
  await probe('Countries: base', '/user-service/countries?limit=5');
  await probe('Countries: countryName=Mexico', '/user-service/countries?limit=5&countryName=Mexico');
  await probe('Countries: name=Mexico', '/user-service/countries?limit=5&name=Mexico');
  await probe('Countries: countryCode=MX', '/user-service/countries?limit=5&countryCode=MX');
  await probe('Countries: code=MX', '/user-service/countries?limit=5&code=MX');
  await probe('Countries: status=Active', '/user-service/countries?limit=5&status=Active');
  await probe('Countries: isActive=true', '/user-service/countries?limit=5&isActive=true');

  console.log('\n--- PROBING VENUES ---');
  await probe('Venues: base', '/user-service/venues?limit=5');
  await probe('Venues: name=Test', '/user-service/venues?limit=5&name=Test');
  await probe('Venues: city=London', '/user-service/venues?limit=5&city=London');
  await probe('Venues: country=UK', '/user-service/venues?limit=5&country=UK');
  await probe('Venues: isVisible=true', '/user-service/venues?limit=5&isVisible=true');
  await probe('Venues: isFeatured=true', '/user-service/venues?limit=5&isFeatured=true');
  await probe('Venues: popularityScore=50', '/user-service/venues?limit=5&popularityScore=50');

  console.log('\n--- PROBING CUSTOMERS (ADMIN AUTH REQ) ---');
  await probe('Customers: base', '/user-service/admin/customers?limit=5');
  await probe('Customers: city=London', '/user-service/admin/customers?limit=5&city=London');
  await probe('Customers: status=Active', '/user-service/admin/customers?limit=5&status=Active');
  await probe('Customers: status=active', '/user-service/admin/customers?limit=5&status=active');
  await probe('Customers: medium=invite_code', '/user-service/admin/customers?limit=5&medium=invite_code');
  await probe('Customers: score=100', '/user-service/admin/customers?limit=5&score=100');
  await probe('Customers: score=90 & status=active', '/user-service/admin/customers?limit=5&score=90&status=active');
})();
