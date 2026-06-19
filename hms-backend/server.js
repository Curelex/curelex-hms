// hms-backend/server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// ── Overdue Reminder + SLA Breach Cron ─────────────────────────
cron.schedule('0 * * * *', async () => {
  try {
    const now = new Date();

    // Overdue tasks notification
    const overdueTasks = await Task.find({ deadline: { $lt: now }, status: { $ne: 'Completed' } });
    for (const task of overdueTasks) {
      io.to(`doctor_${task.assignedTo}`).emit('task:overdue', task);
    }
    console.log(`Checked for overdue tasks: ${overdueTasks.length} found`);

    // SLA breach detection
    const slaTasks = await Task.find({
      slaHours: { $gt: 0 },
      slaBreached: { $ne: true },
      status: { $ne: 'Completed' },
      createdAt: { $lte: new Date(now.getTime() - 1000 * 60 * 60) },
    });
    for (const task of slaTasks) {
      const slaDeadline = new Date(task.createdAt.getTime() + task.slaHours * 60 * 60 * 1000);
      if (now >= slaDeadline) {
        task.slaBreached = true;
        task.slaBreachedAt = now;
        await task.save();
        await Notification.create({
          userId: task.assignedTo,
          message: `SLA BREACHED: Task "${task.title}" exceeded ${task.slaHours}h SLA`,
          taskId: task._id,
          clinicId: task.clinicId,
        });
        await Notification.create({
          userId: task.createdBy,
          message: `SLA BREACHED: Task "${task.title}" for ${task.assignedRole} exceeded ${task.slaHours}h SLA`,
          taskId: task._id,
          clinicId: task.clinicId,
        });
        io.to(`doctor_${task.assignedTo}`).emit('task:sla-breach', task);
      }
    }
    console.log(`SLA breach check complete`);

    // Auto-generate ongoing tasks
    const ongoingParents = await Task.find({
      isOngoing: true,
      status: 'Completed',
      $or: [
        { lastGenerated: { $exists: false } },
        { lastGenerated: null },
      ],
    });
    let genCount = 0;
    for (const parent of ongoingParents) {
      const nextDate = new Date(parent.deadline);
      switch (parent.recurrence) {
        case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
        case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
        case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      }
      if (nextDate <= now) {
        const newTask = new Task({
          title: parent.title,
          description: parent.description,
          priority: parent.priority,
          deadline: nextDate,
          assignedTo: parent.assignedTo,
          assignedRole: parent.assignedRole,
          createdBy: parent.createdBy,
          clinicId: parent.clinicId,
          recurrence: parent.recurrence,
          isOngoing: true,
          slaHours: parent.slaHours,
          parentTaskId: parent.parentTaskId || parent._id,
        });
        await newTask.save();
        parent.lastGenerated = now;
        await parent.save();
        genCount++;
        if (newTask.assignedTo) {
          await Notification.create({
            userId: newTask.assignedTo,
            message: `New ongoing task: ${newTask.title} (due ${nextDate.toLocaleDateString()})`,
            taskId: newTask._id,
            clinicId: newTask.clinicId,
          });
        }
      }
    }
    if (genCount > 0) console.log(`Generated ${genCount} ongoing task instances`);
  } catch (err) {
    console.error('Cron job error:', err);
  }
});

io.on('connection', (socket) => {
  socket.on('doctor:join', (doctorId) => {
    if (doctorId) {
      socket.join(`doctor_${doctorId}`);
    }
  });
  socket.on('staff:join', (staffId) => {
    socket.join('emergency_staff');
  });
});

const emergencyRoutes = emergencyRoutesFactory(io);
const taskRoutes = taskRoutesFactory(io);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// DEBUG: Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/billing-requests', billingRequestsRoutes);
app.use('/api/admissions', admissionsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/vendors', vendorsRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/tokens', tokensRoutes);
app.use('/api/patient-records', patientRecordsRoutes);
app.use('/api/staff-work', staffWorkRoutes);
app.use('/api/room-settings', roomRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/files', fileRoutes);

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
app.use('/api/patient-records', require('./routes/patientRecords'));
app.use('/api/staff-work',      require('./routes/staffWork'));
app.use('/api/room-settings',   require('./routes/room'));
app.use('/api/emergency',       emergencyRoutes);
app.use('/api/patient-portal',  require('./routes/patientPortal'));
app.use('/api/clinics', require('./routes/clinics'));

// ── Serve uploaded files statically ──────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => res.json({ message: 'HMS API Running' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
