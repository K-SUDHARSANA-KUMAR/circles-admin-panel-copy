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
  // 1. Fetch cities to get a real countryId
  const citiesRes = await get('/user-service/cities?limit=5');
  const cities = citiesRes.data?.result?.data?.items ?? citiesRes.data?.data?.items ?? [];
  if (cities.length === 0) {
    console.log('No cities found');
    return;
  }
  
  const city = cities[0];
  const countryId = city.countryId ?? city.country_id ?? city.country?.countryId;
  console.log(`Using country: ${city.country?.name || 'unknown'} (ID: ${countryId}) from city: ${city.name}`);

  // 2. Query cities with this countryId
  const filterRes = await get(`/user-service/cities?limit=5&countryId=${countryId}`);
  console.log('Cities Filter Status:', filterRes.status);
  console.log('Cities Filter Result:', JSON.stringify(filterRes.data, null, 2));
})();
