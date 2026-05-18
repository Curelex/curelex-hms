// hms-backend/server.js
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const dotenv   = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

app.use('/api/auth',             require('./routes/auth'));
app.use('/api/patients',         require('./routes/patients'));
app.use('/api/billing',          require('./routes/billing'));
app.use('/api/billing-requests', require('./routes/billingRequests'));
app.use('/api/admissions',       require('./routes/admissions'));   // ← NEW (IPD)
app.use('/api/pharmacy',         require('./routes/pharmacy'));
app.use('/api/lab',              require('./routes/lab'));
app.use('/api/inventory',        require('./routes/inventory'));
app.use('/api/dashboard',        require('./routes/dashboard'));
app.use('/api/staff',            require('./routes/staff'));
app.use('/api/tokens',           require('./routes/tokens'));
app.use('/api/staff-work', require('./routes/staffWork'));

app.get('/', (req, res) => res.json({ message: 'HMS API Running' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));