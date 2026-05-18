// hms-backend/routes/dashboard.js
const express  = require('express');
const router   = express.Router();
const auth     = require('../middleware/auth');

const Patient     = require('../models/Patient');
const Billing     = require('../models/Billing');
const Pharmacy    = require('../models/Pharmacy');
const Lab         = require('../models/Lab');
const Inventory   = require('../models/Inventory');
const Admission   = require('../models/Admission');   // ← NEW

router.get('/stats', auth, async (req, res) => {
  try {
    const role   = req.user.role;
    const userId = req.user.id;
    const today  = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    /* ── Helpers shared across roles ──────────────────────── */
    const todayAppointments   = await Appointment.countDocuments({ date: { $gte: today, $lt: tomorrow } });
    const pendingAppointments = await Appointment.countDocuments({ status: 'Scheduled' });
    const recentAppointments  = await Appointment
      .find({ date: { $gte: today, $lt: tomorrow } })
      .populate('patient', 'name')
      .populate('doctor',  'name')
      .sort({ time: 1 })
      .limit(5);

    // Currently admitted patients count — shared by multiple roles
    const admittedPatients = await Admission.countDocuments({ status: 'Admitted' });

    /* ──────────────────────────────────────────────────────
       ADMIN — full stats
    ────────────────────────────────────────────────────── */
    if (role === 'admin') {
      const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const [
        totalPatients, activePatients, totalRevenue,
        pendingBills, lowStockItems, pendingLabs, monthlyRevenue,
      ] = await Promise.all([
        Patient.countDocuments(),
        Patient.countDocuments({ status: 'Active' }),
        Billing.aggregate([{ $match: { paymentStatus: 'Paid' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
        Billing.countDocuments({ paymentStatus: 'Pending' }),
        Inventory.countDocuments({ quantity: { $lt: 10 } }),
        Lab.countDocuments({ status: 'Pending' }),
        Billing.aggregate([
          { $match: { paymentStatus: 'Paid', createdAt: { $gte: sixMonthsAgo } } },
          { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, total: { $sum: '$totalAmount' } } },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]),
      ]);

      // Recent admitted patients for admin IPD panel
      const recentAdmissions = await Admission.find({ status: 'Admitted' })
        .populate('patient', 'name patientId')
        .populate('doctor',  'name')
        .sort({ admissionDate: -1 })
        .limit(5);

      return res.json({
        totalPatients,
        activePatients,
        admittedPatients,           // ← NEW
        todayAppointments,
        pendingAppointments,
        totalRevenue: totalRevenue[0]?.total || 0,
        pendingBills,
        lowStockItems,
        pendingLabs,
        monthlyRevenue,
        recentAppointments,
        recentAdmissions,           // ← NEW
      });
    }

    /* ──────────────────────────────────────────────────────
       DOCTOR — my patients + my appointments + labs + IPD
    ────────────────────────────────────────────────────── */
    if (role === 'doctor') {
      const myPatients  = await Appointment.distinct('patient', { doctor: userId });
      const pendingLabs = await Lab.countDocuments({ doctor: userId, status: 'Pending' });

      // Admitted patients assigned to this doctor
      const myAdmittedPatients = await Admission.countDocuments({ doctor: userId, status: 'Admitted' });

      return res.json({
        myPatients: myPatients.length,
        admittedPatients: myAdmittedPatients,   // ← NEW
        todayAppointments,
        pendingAppointments,
        pendingLabs,
        recentAppointments: recentAppointments.filter(a => String(a.doctor?._id) === String(userId)),
      });
    }

    /* ──────────────────────────────────────────────────────
       NURSE — active patients + admitted + today schedule + pending labs
    ────────────────────────────────────────────────────── */
    if (role === 'nurse') {
      const activePatients = await Patient.countDocuments({ status: 'Active' });
      const pendingLabs    = await Lab.countDocuments({ status: 'Pending' });

      return res.json({
        activePatients,
        admittedPatients,           // ← NEW
        todayAppointments,
        pendingLabs,
        recentAppointments,
      });
    }

    /* ──────────────────────────────────────────────────────
       RECEPTIONIST — today appts + pending bills + admitted
    ────────────────────────────────────────────────────── */
    if (role === 'receptionist') {
      const [totalPatients, pendingBills] = await Promise.all([
        Patient.countDocuments(),
        Billing.countDocuments({ paymentStatus: 'Pending' }),
      ]);

      // Recent admissions — receptionist manages these
      const recentAdmissions = await Admission.find({ status: 'Admitted' })
        .populate('patient', 'name patientId')
        .populate('doctor',  'name')
        .sort({ admissionDate: -1 })
        .limit(5);

      return res.json({
        todayAppointments,
        pendingAppointments,
        pendingBills,
        totalPatients,
        admittedPatients,           // ← NEW
        recentAppointments,
        recentAdmissions,           // ← NEW
      });
    }

    /* ──────────────────────────────────────────────────────
       PHARMACIST — stock levels + pending orders
    ────────────────────────────────────────────────────── */
    if (role === 'pharmacist') {
      const [lowStockItems, outOfStock, pendingOrders, totalMeds, lowStockMeds] = await Promise.all([
        Inventory.countDocuments({ quantity: { $gt: 0, $lt: 10 } }),
        Inventory.countDocuments({ quantity: 0 }),
        Pharmacy.countDocuments({ status: 'Pending' }),
        Inventory.countDocuments(),
        Inventory.find({ quantity: { $lt: 10 } }).sort({ quantity: 1 }).limit(8),
      ]);

      return res.json({ lowStockItems, outOfStock, pendingOrders, totalMeds, lowStockMeds });
    }

    /* ──────────────────────────────────────────────────────
       LAB TECH — pending/completed/urgent tests
    ────────────────────────────────────────────────────── */
    if (role === 'lab_technician') {
      const [pendingLabs, completedLabs, urgentLabs, totalLabs, pendingLabList] = await Promise.all([
        Lab.countDocuments({ status: 'Pending' }),
        Lab.countDocuments({ status: 'Completed', updatedAt: { $gte: today } }),
        Lab.countDocuments({ status: 'Pending', priority: 'urgent' }),
        Lab.countDocuments(),
        Lab.find({ status: 'Pending' })
           .populate('patient', 'name')
           .populate('doctor',  'name')
           .sort({ priority: -1, createdAt: 1 })
           .limit(8),
      ]);

      return res.json({ pendingLabs, completedLabs, urgentLabs, totalLabs, pendingLabList });
    }

    /* Fallback */
    return res.json({ todayAppointments, pendingAppointments, recentAppointments });

  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;