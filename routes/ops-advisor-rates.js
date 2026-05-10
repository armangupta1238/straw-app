const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// GET /api/ops-advisor-rates
// Returns clean rate card from calculator_settings for the Ops Advisor.
// Reads the single settings row (no scenario split — new calculator is single scenario).
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT settings, updated_at, updated_by FROM calculator_settings WHERE id = 1'
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'No calculator settings found. Open the Expense Calculator and save values first.'
      });
    }

    const raw = result.rows[0];
    const s   = raw.settings;

    if (!s) {
      return res.status(404).json({ error: 'Settings empty.' });
    }

    const n = (k) => parseFloat(s[k]) || 0;

    const rates = {
      // Equipment rental (daily mode — primary)
      tractorRentalPerDay:       n('rentTractorDay'),
      longTrolleyRentalPerDay:   n('rentLongTrolleyDay'),
      normalTrolleyRentalPerDay: n('rentNormalTrolleyDay'),
      balerRentalPerDay:         n('rentBalerDay'),

      // Labour
      driverWagePerDay:          n('drvDayEach'),
      labourWagePerDay:          n('labDayEach'),
      numDriversDefault:         n('drvDayNum'),
      numLabourDefault:          n('labDayNum'),

      // Diesel
      dieselLPH:                 n('dieselLPH'),
      dieselHrsPerDay:           n('dieselHrs'),
      dieselRatePerLitre:        n('dieselRate'),
      dieselCostPerTractorPerDay: n('dieselLPH') * n('dieselHrs') * n('dieselRate'),

      // Revenue
      sellingPricePerTon:        n('sellingPrice'),
      farmerCompPerAcre:         n('farmerPerAcre'),

      // Transport
      transportCostPerTrip:      n('costPerTrip'),
      tripsPerDayDefault:        n('trips'),
      warehouseDistKm:           n('distKm'),

      // Fixed costs
      plasticBundlePerDay:       n('bundleCost'),

      // Operation defaults
      yieldPerAcre:              n('yieldPerAcre'),
      acresPerDay:               n('acresPerDay'),

      // Buyer provided counts (cost-free, for reference)
      buyerTractors:             n('buyerTractorNumDay'),
      buyerLongTrolleys:         n('buyerLongTrolleyNumDay'),
      buyerBalers:               n('buyerBalerNumDay'),

      // Meta
      lastUpdated:               raw.updated_at,
      lastUpdatedBy:             raw.updated_by || 'promoter',
    };

    res.json(rates);
  } catch (err) {
    console.error('GET /api/ops-advisor-rates error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
