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
  // 1. Fetch cities
  const citiesRes = await get('/user-service/cities?limit=5');
  const cities = citiesRes.data?.result?.data?.items ?? citiesRes.data?.data?.items ?? [];
  if (cities.length === 0) {
    console.log('No cities found or request failed');
    return;
  }
  
  const city = cities[0];
  const cityId = city.cityId ?? city.city_id ?? city.id;
  console.log(`Using city: ${city.name} (ID: ${cityId})`);

  // 2. Query venues with this cityId
  const venuesRes = await get(`/user-service/venues?limit=5&cityId=${cityId}`);
  console.log('Venues Query Status:', venuesRes.status);
  console.log('Venues Query Result:', JSON.stringify(venuesRes.data, null, 2));
})();
