// hms-backend/routes/vendors.js
const router    = require('express').Router();
const Vendor    = require('../models/Vendor');
const Inventory = require('../models/Inventory');
const auth      = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ── GET vendor stats summary ─────────────────────────────────────
router.get('/stats/summary', auth, async (req, res) => {
  try {
    // ✅ FIX: scoped to clinic
    const clinicId = req.user.clinicId;

    const totalVendors    = await Vendor.countDocuments({ clinicId });
    const activeVendors   = await Vendor.countDocuments({ clinicId, status: 'Active' });
    const inactiveVendors = await Vendor.countDocuments({ clinicId, status: 'Inactive' });

    const byCategory = await Vendor.aggregate([
      { $match: { clinicId: clinicId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const categoryMap = {};
    byCategory.forEach(cat => { categoryMap[cat._id] = cat.count; });

    res.json({ totalVendors, activeVendors, inactiveVendors, byCategory: categoryMap });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET active vendors for dropdown ─────────────────────────────
router.get('/list/active', auth, async (req, res) => {
  try {
    // ✅ scoped to clinic
    const vendors = await Vendor.find({ clinicId: req.user.clinicId, status: 'Active' })
      .select('name vendorId contactPerson phone')
      .sort({ name: 1 });
    res.json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET all vendors ──────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { search, category, status, page = 1, limit = 20 } = req.query;

    // ✅ FIX: always scope to current clinic
    let query = { clinicId: req.user.clinicId };

    if (search) {
      query.$or = [
        { name:          { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { email:         { $regex: search, $options: 'i' } },
        { phone:         { $regex: search, $options: 'i' } }
      ];
    }
    if (category) query.category = category;
    if (status)   query.status   = status;

    const total   = await Vendor.countDocuments(query);
    const vendors = await Vendor.find(query)
      .populate('createdBy', 'name')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ vendors, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single vendor with their items ──────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    // ✅ scoped to clinic
    const vendor = await Vendor.findOne({ _id: req.params.id, clinicId: req.user.clinicId })
      .populate('createdBy', 'name');
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    // ✅ only show items from this clinic
    const suppliedItems = await Inventory.find({ vendor: vendor._id, clinicId: req.user.clinicId })
      .select('name itemCode quantity unitPrice category');

    res.json({ vendor, suppliedItems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE vendor ────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    // ✅ FIX: attach clinicId from JWT
    const vendor = await Vendor.create({
      ...req.body,
      clinicId:  req.user.clinicId,   // ← key fix
      createdBy: req.user.id,
    });
    res.status(201).json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE vendor ────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    // ✅ scoped to clinic — can't edit another clinic's vendor
    const vendor = await Vendor.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user.clinicId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });
    res.json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE vendor ────────────────────────────────────────────────
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    // ✅ scoped to clinic for both the check and the delete
    const linkedItems = await Inventory.countDocuments({ vendor: req.params.id, clinicId: req.user.clinicId });
    if (linkedItems > 0) {
      return res.status(400).json({
        message: `Cannot delete vendor. ${linkedItems} inventory item(s) are linked.`
      });
    }

    const vendor = await Vendor.findOneAndDelete({ _id: req.params.id, clinicId: req.user.clinicId });
    if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

    res.json({ message: 'Vendor deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;