// hms-backend/server.js

import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import cron from 'node-cron';

// Models (USED IN CRON)
import Task from './models/Task.js';
import Notification from './models/Notification.js';

// Routes
import authRoutes from './routes/auth.js';
import patientRoutes from './routes/patients.js';
import billingRoutes from './routes/billing.js';
import billingRequestRoutes from './routes/billingRequests.js';
import admissionRoutes from './routes/admissions.js';
import pharmacyRoutes from './routes/pharmacy.js';
import labRoutes from './routes/lab.js';
import inventoryRoutes from './routes/inventory.js';
import vendorRoutes from './routes/vendors.js';
import equipmentRoutes from './routes/equipment.js';
import dashboardRoutes from './routes/dashboard.js';
import staffRoutes from './routes/staff.js';
import tokenRoutes from './routes/tokens.js';
import patientRecordRoutes from './routes/patientRecords.js';
import staffWorkRoutes from './routes/staffWork.js';
import roomRoutes from './routes/room.js';
import patientPortalRoutes from './routes/patientPortal.js';
import clinicRoutes from './routes/clinics.js';
import taskRoutes from './routes/tasks.js';
import fileRoutes from './routes/files.js';
import emergencyRoutesFactory from './routes/emergency.js';
import taskRoutesFactory from './routes/tasks.js';

dotenv.config();

// __dirname fix (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// App setup
const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Debug logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

// ---------------- SOCKET ----------------
io.on('connection', (socket) => {
  socket.on('doctor:join', (doctorId) => {
    if (doctorId) socket.join(`doctor_${doctorId}`);
  });

  socket.on('staff:join', () => {
    socket.join('emergency_staff');
  });
});

// Inject io into factories
const emergencyRoutes = emergencyRoutesFactory(io);
const tasksRoutes = taskRoutesFactory(io);

// ---------------- CRON JOB ----------------
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    const overdueTasks = await Task.find({
      deadline: { $lt: now },
      status: { $ne: 'Completed' }
    });

    for (const task of overdueTasks) {
      io.to(`doctor_${task.assignedTo}`).emit('task:overdue', task);
    }

    const slaTasks = await Task.find({
      slaHours: { $gt: 0 },
      slaBreached: { $ne: true },
      status: { $ne: 'Completed' }
    });

    for (const task of slaTasks) {
      const slaDeadline =
        new Date(task.createdAt.getTime() + task.slaHours * 60 * 60 * 1000);

      if (now >= slaDeadline) {
        task.slaBreached = true;
        task.slaBreachedAt = now;
        await task.save();

        await Notification.create({
          userId: task.assignedTo,
          message: `SLA BREACHED: ${task.title}`,
          taskId: task._id,
          clinicId: task.clinicId
        });

        io.to(`doctor_${task.assignedTo}`).emit('task:sla-breach', task);
      }
    }

    console.log('Cron executed successfully');
  } catch (err) {
    console.error('Cron error:', err);
  }
});

// ---------------- ROUTES ----------------
app.use('/api/auth', authRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing-requests', billingRequestRoutes);
app.use('/api/admissions', admissionRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/patient-records', patientRecordRoutes);
app.use('/api/staff-work', staffWorkRoutes);
app.use('/api/room-settings', roomRoutes);
app.use('/api/patient-portal', patientPortalRoutes);
app.use('/api/clinics', clinicRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/emergency', emergencyRoutes);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'HMS API Running' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
