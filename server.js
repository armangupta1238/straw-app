const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const farmersRouter    = require('./routes/farmers');
const villagesRouter   = require('./routes/villages');
const seasonsRouter    = require('./routes/seasons');
const pickupsRouter    = require('./routes/pickups');
const distanceRouter   = require('./routes/distance');
const authRouter       = require('./routes/auth');
const warehousesRouter = require('./routes/warehouses');

app.use('/api/farmers',    farmersRouter);
app.use('/api/villages',   villagesRouter);
app.use('/api/seasons',    seasonsRouter);
app.use('/api/pickups',    pickupsRouter);
app.use('/api/distance',   distanceRouter);
app.use('/api/auth',       authRouter);
app.use('/api/warehouses', warehousesRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Straw App Backend is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
