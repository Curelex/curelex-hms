const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');          // ← ADDED
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

io.on('connection', (socket) => {

  // When doctor logs in, join their private room
  socket.on('doctor:join', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
    }
  });

  // When receptionist/nurse logs in (for general updates)
  socket.on('staff:join', (staffId) => {
    socket.join('emergency_staff');
  });

});

const emergencyRoutes = require('./routes/emergency')(io);

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

// ── Routes ────────────────────────────────────────────────────────
app.use('/api/auth',            require('./routes/auth'));
app.use('/api/patients',        require('./routes/patients'));
app.use('/api/billing',         require('./routes/billing'));
app.use('/api/billing-requests',require('./routes/billingRequests'));
app.use('/api/admissions',      require('./routes/admissions'));
app.use('/api/pharmacy',        require('./routes/pharmacy'));
app.use('/api/lab',             require('./routes/lab'));
app.use('/api/inventory',       require('./routes/inventory'));
app.use('/api/vendors',         require('./routes/vendors'));
app.use('/api/equipment',       require('./routes/equipment'));
app.use('/api/dashboard',       require('./routes/dashboard'));
app.use('/api/staff',           require('./routes/staff'));
app.use('/api/tokens',          require('./routes/tokens'));
app.use('/api/patient-records', require('./routes/patientRecords')); // ← ADDED
app.use('/api/staff-work',      require('./routes/staffWork'));
app.use('/api/room-settings',   require('./routes/room'));
app.use('/api/emergency',       emergencyRoutes);

// ── Serve uploaded files statically ──────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // ← ADDED

app.get('/', (req, res) => res.json({ message: 'HMS API Running' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));