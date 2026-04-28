const express = require('express');
const router  = express.Router();
const https   = require('https');

function httpsGet(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) return reject(new Error('Too many redirects'));
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location, redirectCount + 1).then(resolve).catch(reject);
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ finalUrl: url, data }));
      }
    }).on('error', reject);
  });
}

function extractCoordsFromUrl(url) {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

function geocodePlace(query, apiKey) {
  return new Promise((resolve) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
    console.log('Geocoding:', query);
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('Geocode status:', json.status);
          if (json.status === 'OK' && json.results[0]) {
            const loc = json.results[0].geometry.location;
            resolve({ lat: loc.lat, lng: loc.lng });
          } else {
            resolve(null);
          }
        } catch(e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

router.post('/resolve', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  console.log('API Key present:', !!apiKey);

  try {
    // Step 1: Follow redirects
    const { finalUrl } = await httpsGet(url);
    console.log('Final URL:', finalUrl);

    // Step 2: Try direct coord extraction
    const direct = extractCoordsFromUrl(finalUrl);
    if (direct) return res.json({ lat: direct.lat, lng: direct.lng });

    // Step 3: Extract q= place name and geocode
    const urlObj = new URL(finalUrl);
    const qParam = urlObj.searchParams.get('q');
    console.log('q param:', qParam);

    if (qParam && apiKey) {
      const coords = await geocodePlace(qParam, apiKey);
      if (coords) return res.json({ lat: coords.lat, lng: coords.lng, place: qParam });
    }

    // Step 4: Try ftid-based place details
    const ftid = urlObj.searchParams.get('ftid');
    console.log('ftid:', ftid);

    if (ftid && apiKey) {
      const coords = await geocodePlace(qParam || ftid, apiKey);
      if (coords) return res.json({ lat: coords.lat, lng: coords.lng });
    }

    return res.status(422).json({ error: 'Could not extract coordinates', resolved_url: finalUrl, api_key_present: !!apiKey });

  } catch(e) {
    console.error('Location resolve error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
