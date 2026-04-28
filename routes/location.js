const express = require('express');
const router  = express.Router();
const https   = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject);
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ url, data, statusCode: res.statusCode }));
      }
    }).on('error', reject);
  });
}

function extractCoordsFromUrl(url) {
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /ll=(-?\d+\.\d+),(-?\d+\.\d+)/,
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/,
    /place\/[^/]+\/@(-?\d+\.\d+),(-?\d+\.\d+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

function geocode(placeQuery, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(placeQuery)}&key=${apiKey}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results[0]) {
            const loc = json.results[0].geometry.location;
            resolve({ lat: loc.lat, lng: loc.lng });
          } else {
            resolve(null);
          }
        } catch(e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

// POST /api/location/resolve
router.post('/resolve', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  try {
    // Step 1: Follow redirect to get final URL
    const result = await httpsGet(url);
    const finalUrl = result.url;

    // Step 2: Try to extract coords directly from URL
    const direct = extractCoordsFromUrl(finalUrl);
    if (direct) return res.json({ lat: direct.lat, lng: direct.lng });

    // Step 3: Extract place name from q= param and geocode it
    const qMatch = finalUrl.match(/[?&]q=([^&]+)/);
    if (qMatch && apiKey) {
      const placeQuery = decodeURIComponent(qMatch[1].replace(/\+/g, ' '));
      const coords = await geocode(placeQuery, apiKey);
      if (coords) return res.json({ lat: coords.lat, lng: coords.lng, place: placeQuery });
    }

    return res.status(422).json({ error: 'Could not extract coordinates', resolved_url: finalUrl });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
