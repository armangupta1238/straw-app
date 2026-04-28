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
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        if (maxRedirects === 0) return reject(new Error('Too many redirects'));
        followRedirects(response.headers.location, maxRedirects - 1).then(resolve).catch(reject);
      } else {
        resolve(response.headers['x-final-url'] || url);
      }
    });
    request.on('error', reject);
    request.setTimeout(5000, () => { request.destroy(); reject(new Error('Timeout')); });
  });
}

// Calculate road distance
router.get('/', async (req, res) => {
  const { lat, lng, warehouse_lat, warehouse_lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const destLat = warehouse_lat || FACTORY_LAT;
  const destLng = warehouse_lng || FACTORY_LNG;

  const KEY = process.env.GOOGLE_MAPS_KEY;
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destLat},${destLng}&mode=driving&key=${KEY}`;
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