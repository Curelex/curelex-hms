const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

const emergencyRoutes = require('./routes/emergency')(io);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/vendors', require('./routes/vendors'));           // NEW
app.use('/api/equipment', require('./routes/equipment'));       // NEW
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/billing-requests', require('./routes/billingRequests'));
app.use('/api/admissions', require('./routes/admissions'));
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/admissions', require('./routes/admissions'));   // ← NEW (IPD)
app.use('/api/pharmacy', require('./routes/pharmacy'));
app.use('/api/lab', require('./routes/lab'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/staff-work', require('./routes/staffWork'));
app.use('/api/room-settings', require('./routes/room'));
app.use('/api/emergency', emergencyRoutes);


app.get('/', (req, res) => res.json({ message: 'HMS API Running' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));