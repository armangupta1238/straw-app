const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const farmersRouter = require('./routes/farmers');
const villagesRouter = require('./routes/villages');
const seasonsRouter = require('./routes/seasons');
const pickupsRouter = require('./routes/pickups');

app.use('/api/farmers', farmersRouter);
app.use('/api/villages', villagesRouter);
app.use('/api/seasons', seasonsRouter);
app.use('/api/pickups', pickupsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Straw App Backend is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});