// hms-backend/models/Inventory.js
const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  // ✅ Every inventory item belongs to a clinic — required, no exceptions
  clinicId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Clinic',
    required: true,
    index:    true
  },

  itemCode:    { type: String },  // unique per clinic (compound index below)
  name:        { type: String, required: true },
  category: {
    type:     String,
    enum:     ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Other'],
    required: true
  },
  description: String,
  quantity:    { type: Number, required: true, default: 0 },
  unit:        { type: String, default: 'Units' },
  unitPrice:   { type: Number, required: true, default: 0 },
  totalValue:  { type: Number, default: 0 },
  reorderLevel:{ type: Number, default: 10 },

  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'Vendor'
  },

  // Keep legacy supplier for backward compatibility
  supplier: {
    name:    String,
    contact: String,
    email:   String
  },

  expiryDate:     Date,
  location:       String,
  lastRestockedAt:Date,

  // ── Equipment-specific fields ──
  equipmentDetails: {
    serialNumber:            { type: String, trim: true },
    modelNumber:             { type: String, trim: true },
    manufacturer:            { type: String, trim: true },
    purchaseDate:            Date,
    warrantyExpiry:          Date,
    lastMaintenanceDate:     Date,
    nextMaintenanceDate:     Date,
    maintenanceIntervalDays: { type: Number, default: 90 },
    condition: {
      type:    String,
      enum:    ['Excellent', 'Good', 'Fair', 'Poor', 'Under Repair', 'Decommissioned'],
      default: 'Good'
    },
    assignedTo: { type: String, trim: true },
    maintenanceLogs: [{
      date:         { type: Date, default: Date.now },
      type:         { type: String, enum: ['Routine', 'Repair', 'Calibration', 'Emergency'], default: 'Routine' },
      performedBy:  String,
      cost:         { type: Number, default: 0 },
      notes:        String,
      nextDueDate:  Date
    }]
  },

  // ── Stock transaction history ──
  transactions: [{
    type:            { type: String, enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN'] },
    quantity:        Number,
    unitPrice:       { type: Number, default: 0 },
    totalPrice:      { type: Number, default: 0 },
    reason:          String,
    referenceNumber: String,
    performedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    performedByName: String,
    notes:           String,
    date:            { type: Date, default: Date.now }
  }],

  status: {
    type:    String,
    enum:    ['Active', 'Inactive', 'Discontinued'],
    default: 'Active'
  }
}, { timestamps: true });

// ✅ itemCode is unique within a clinic — NOT globally unique
InventorySchema.index({ itemCode: 1, clinicId: 1 }, { unique: true, sparse: true });

// ✅ Auto-generate itemCode scoped to this clinic so codes never collide across clinics
InventorySchema.pre('save', async function (next) {
  if (!this.itemCode) {
    const count = await mongoose.model('Inventory').countDocuments({ clinicId: this.clinicId });
    const prefix =
      this.category === 'Equipment' ? 'EQP' :
      this.category === 'Medicine'  ? 'MED' : 'INV';
    this.itemCode = prefix + String(count + 1).padStart(5, '0');
  }
  // Keep totalValue in sync
  this.totalValue = this.quantity * this.unitPrice;
  next();
});

// ── Virtuals ──
InventorySchema.virtual('stockStatus').get(function () {
  if (this.quantity <= 0)               return 'Out of Stock';
  if (this.quantity <= this.reorderLevel) return 'Low Stock';
  return 'In Stock';
});

InventorySchema.virtual('maintenanceStatus').get(function () {
  if (this.category !== 'Equipment' || !this.equipmentDetails?.nextMaintenanceDate) return null;
  const today    = new Date();
  const next     = new Date(this.equipmentDetails.nextMaintenanceDate);
  const daysUntil = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
  if (daysUntil < 0)  return 'Overdue';
  if (daysUntil <= 7) return 'Due Soon';
  return 'OK';
});

InventorySchema.set('toJSON',   { virtuals: true });
InventorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Inventory', InventorySchema);