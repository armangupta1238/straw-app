const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const farmersRouter          = require('./routes/farmers');
const villagesRouter         = require('./routes/villages');
const seasonsRouter          = require('./routes/seasons');
const pickupsRouter          = require('./routes/pickups');
const distanceRouter         = require('./routes/distance');
const authRouter             = require('./routes/auth');
const warehousesRouter       = require('./routes/warehouses');
const locationRouter         = require('./routes/location');
const machineryRouter        = require('./routes/machinery');
const pickupSchedulesRouter      = require('./routes/pickup-schedules');
const calculatorSettingsRouter   = require('./routes/calculator-settings');
const operationalLimitsRouter    = require('./routes/operational-limits');
const opsAdvisorChatRouter       = require('./routes/ops-advisor-chat');
const opsAdvisorRatesRouter      = require('./routes/ops-advisor-rates');

app.use('/api/farmers',           farmersRouter);
app.use('/api/villages',          villagesRouter);
app.use('/api/seasons',           seasonsRouter);
app.use('/api/pickups',           pickupsRouter);
app.use('/api/distance',          distanceRouter);
app.use('/api/auth',              authRouter);
app.use('/api/warehouses',        warehousesRouter);
app.use('/api/location',          locationRouter);
app.use('/api/machinery',         machineryRouter);
app.use('/api/pickup-schedules',      pickupSchedulesRouter);
app.use('/api/calculator-settings',   calculatorSettingsRouter);
app.use('/api/operational-limits',    operationalLimitsRouter);
app.use('/api/ops-advisor-chat',      opsAdvisorChatRouter);
app.use('/api/ops-advisor-rates',     opsAdvisorRatesRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Straw App Backend is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
