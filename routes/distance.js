const express = require('express');
const router = express.Router();
const https = require('https');

const FACTORY_LAT = 21.419798;
const FACTORY_LNG = 83.585250;

// Resolve short Google Maps link by following redirects
router.get('/resolve', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });

  try {
    const resolved = await followRedirects(url);
    res.json({ resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function followRedirects(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    const request = https.get(url, options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        if (maxRedirects === 0) return reject(new Error('Too many redirects'));
        const next = response.headers.location.startsWith('http')
          ? response.headers.location
          : new URL(response.headers.location, url).href;
        followRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
      } else {
        // Consume response to free socket
        response.resume();
        resolve(url);
      }
    });
    request.on('error', reject);
    request.setTimeout(8000, () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

// Calculate road distance
router.get('/', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });
  const KEY = process.env.GOOGLE_MAPS_KEY;
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${FACTORY_LAT},${FACTORY_LNG}&mode=driving&key=${KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.rows[0].elements[0].status === 'OK') {
      const distanceKm = (data.rows[0].elements[0].distance.value / 1000).toFixed(1);
      const transportCost = Math.round(distanceKm * 2 * 18);
      res.json({ distance_km: distanceKm, transport_cost: transportCost });
    } else {
      res.status(400).json({ error: 'Could not calculate distance' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
