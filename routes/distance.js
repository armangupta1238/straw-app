const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');

const FACTORY_LAT = 21.419798;
const FACTORY_LNG = 83.585250;

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

function followRedirects(url, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
      }
    }, (res) => {
      // Must consume body to free socket
      res.resume();
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects === 0) return reject(new Error('Too many redirects'));
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        followRedirects(next, maxRedirects - 1).then(resolve).catch(reject);
      } else {
        resolve(url);
      }
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

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
