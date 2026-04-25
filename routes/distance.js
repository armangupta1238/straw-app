const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Missing coordinates' });

  const FACTORY_LAT = 21.419798;
  const FACTORY_LNG = 83.585250;
  const KEY = process.env.GOOGLE_MAPS_KEY;

  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${FACTORY_LAT},${FACTORY_LNG}&mode=driving&key=${KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.rows[0].elements[0].status === 'OK') {
      const distanceM = data.rows[0].elements[0].distance.value;
      const distanceKm = (distanceM / 1000).toFixed(1);
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