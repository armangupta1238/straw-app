const express = require('express');
const router  = express.Router();
const https   = require('https');

// Follows a short URL and returns the final redirected URL
function followRedirect(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');
    protocol.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow the redirect
        followRedirect(res.headers.location).then(resolve).catch(reject);
      } else {
        resolve(url);
      }
    }).on('error', reject);
  });
}

function extractCoords(url) {
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

// POST /api/location/resolve
// Body: { url: "https://maps.app.goo.gl/..." }
router.post('/resolve', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const finalUrl = await followRedirect(url);
    const coords = extractCoords(finalUrl);
    if (coords) {
      return res.json({ lat: coords.lat, lng: coords.lng, resolved_url: finalUrl });
    }
    // If coords not found in URL, try Google Geocoding as fallback
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(finalUrl)}&key=${apiKey}`;
      https.get(geocodeUrl, (gres) => {
        let data = '';
        gres.on('data', chunk => data += chunk);
        gres.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.results && json.results[0]) {
              const loc = json.results[0].geometry.location;
              return res.json({ lat: loc.lat, lng: loc.lng, resolved_url: finalUrl });
            }
          } catch(e) {}
          res.status(422).json({ error: 'Could not extract coordinates', resolved_url: finalUrl });
        });
      });
    } else {
      res.status(422).json({ error: 'Could not extract coordinates', resolved_url: finalUrl });
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
