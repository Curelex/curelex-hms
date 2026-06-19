import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import bcrypt from "bcryptjs";
// hms-backend/routes/inventory.js
const router = require('express').Router();
const Inventory = require('../models/Inventory');
const {auth} = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// ── GET all inventory items (with filters) ──
router.get('/', auth, async (req, res) => {
  try {
    const clinicId = req.user.clinicId; // ✅ always scope to clinic
    const { category, search, lowStock, equipment, vendor, page = 1, limit = 20 } = req.query;

    let query = { clinicId }; // ✅ base filter — never leaks across clinics

    if (category) query.category = category;
    if (vendor)   query.vendor   = vendor;
    if (search) {
      query.$or = [
        { name:                               { $regex: search, $options: 'i' } },
        { itemCode:                           { $regex: search, $options: 'i' } },
        { 'equipmentDetails.serialNumber':    { $regex: search, $options: 'i' } }
      ];
    }
    if (lowStock  === 'true') query.$expr       = { $lte: ['$quantity', '$reorderLevel'] };
    if (equipment === 'true') query.category    = 'Equipment';

    const total = await Inventory.countDocuments(query);
    const items = await Inventory.find(query)
      .populate('vendor', 'name contactPerson phone email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET low stock alerts ──
router.get('/alerts/low-stock', auth, async (req, res) => {
  try {
    const items = await Inventory.find({
      clinicId: req.user.clinicId, // ✅
      $expr:    { $lte: ['$quantity', '$reorderLevel'] },
      quantity: { $gt: 0 },
      status:   'Active'
    })
      .populate('vendor', 'name contactPerson phone')
      .sort({ quantity: 1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET out of stock items ──
router.get('/alerts/out-of-stock', auth, async (req, res) => {
  try {
    const items = await Inventory.find({
      clinicId: req.user.clinicId, // ✅
      quantity: 0,
      status:   'Active'
    }).populate('vendor', 'name contactPerson');

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET equipment due for maintenance ──
router.get('/alerts/due-maintenance', auth, async (req, res) => {
  try {
    const items = await Inventory.find({
      clinicId:                              req.user.clinicId, // ✅
      category:                             'Equipment',
      'equipmentDetails.nextMaintenanceDate': { $lte: new Date() },
      status:                               'Active'
    });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET equipment only (used by Equipment tab) ──
router.get('/equipment', auth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const items = await Inventory.find({
      clinicId: req.user.clinicId, // ✅
      category: 'Equipment'
    })
      .populate('vendor', 'name contactPerson phone email')
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET stock valuation report ──
router.get('/reports/valuation', auth, async (req, res) => {
  try {
    const { category } = req.query;
    let query = { clinicId: req.user.clinicId, status: 'Active' }; // ✅
    if (category) query.category = category;

    const items = await Inventory.find(query)
      .select('name category quantity unitPrice totalValue');

    const totalValue = items.reduce((sum, i) => sum + (i.totalValue || 0), 0);
    const byCategory = {};
    items.forEach(item => {
      byCategory[item.category] = (byCategory[item.category] || 0) + (item.totalValue || 0);
    });

    res.json({ totalValue, itemCount: items.length, byCategory, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single item ──
router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id:      req.params.id,
      clinicId: req.user.clinicId // ✅ prevent cross-clinic access
    }).populate('vendor', 'name contactPerson phone email gstNumber');

    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── CREATE item ──
router.post('/', auth, async (req, res) => {
  try {
    const item = await Inventory.create({
      ...req.body,
      clinicId: req.user.clinicId // ✅ always attach clinic — frontend cannot override
    });
    const populated = await Inventory.findById(item._id)
      .populate('vendor', 'name contactPerson');

    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── UPDATE item ──
router.put('/:id', auth, async (req, res) => {
  try {
    // Strip clinicId from body so a malicious request can't move an item to another clinic
    const { clinicId: _stripped, ...updateData } = req.body;

    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, clinicId: req.user.clinicId }, // ✅ scoped
      updateData,
      { new: true, runValidators: true }
    ).populate('vendor', 'name contactPerson');

    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ADD STOCK TRANSACTION ──
router.post('/:id/transaction', auth, async (req, res) => {
  try {
    const { type, quantity, reason, unitPrice, referenceNumber, notes } = req.body;

    const item = await Inventory.findOne({
      _id:      req.params.id,
      clinicId: req.user.clinicId // ✅
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (type === 'OUT' && item.quantity < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const oldQuantity = item.quantity;
    if      (type === 'IN')         item.quantity += quantity;
    else if (type === 'OUT')        item.quantity -= quantity;
    else if (type === 'ADJUSTMENT') item.quantity  = quantity;
    else if (type === 'RETURN')     item.quantity += quantity;

    const transaction = {
      type,
      quantity,
      unitPrice:       unitPrice || item.unitPrice,
      totalPrice:      quantity  * (unitPrice || item.unitPrice),
      reason:          reason          || '',
      referenceNumber: referenceNumber || '',
      performedBy:     req.user.id,
      performedByName: req.user.name,
      notes:           notes || '',
      date:            new Date()
    };

    item.transactions.push(transaction);
    if (type === 'IN') item.lastRestockedAt = new Date();
    item.totalValue = item.quantity * item.unitPrice;

    await item.save();

    res.json({
      message: 'Stock transaction completed',
      item: {
        id:         item._id,
        name:       item.name,
        oldQuantity,
        newQuantity: item.quantity,
        totalValue:  item.totalValue
      },
      transaction
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET transaction history for item ──
router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const item = await Inventory.findOne({
      _id:      req.params.id,
      clinicId: req.user.clinicId // ✅
    }).select('transactions name itemCode');

    if (!item) return res.status(404).json({ message: 'Item not found' });

    const transactions = [...item.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, Number(limit));

    res.json({
      item:         { id: item._id, name: item.name, itemCode: item.itemCode },
      transactions
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── LOG EQUIPMENT MAINTENANCE ──
router.post('/:id/maintenance', auth, async (req, res) => {
  try {
    const item = await Inventory.findOne({
      _id:      req.params.id,
      clinicId: req.user.clinicId // ✅
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });

    if (!item.equipmentDetails) {
      return res.status(400).json({ message: 'Item is not equipment' });
    }

    item.equipmentDetails.maintenanceLogs.push({
      ...req.body,
      date: new Date()
    });

    if (req.body.nextDueDate) {
      item.equipmentDetails.nextMaintenanceDate = new Date(req.body.nextDueDate);
    }
    if (req.body.type === 'Repair' || req.body.condition) {
      item.equipmentDetails.condition = req.body.condition || item.equipmentDetails.condition;
    }

    item.equipmentDetails.lastMaintenanceDate = new Date();

    await item.save();
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE item (admin only) ──
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
  try {
    const deleted = await Inventory.findOneAndDelete({
      _id:      req.params.id,
      clinicId: req.user.clinicId // ✅ can only delete own clinic's items
    });
    if (!deleted) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;