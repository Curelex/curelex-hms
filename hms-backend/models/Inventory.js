const mongoose = require('mongoose');

const InventorySchema = new mongoose.Schema({
  itemCode: { type: String, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['Medicine', 'Equipment', 'Consumable', 'Surgical', 'Other'], required: true },
  description: String,
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'units' },
  unitPrice: { type: Number, required: true },
  totalValue: { type: Number, default: 0 },
  reorderLevel: { type: Number, default: 10 },
  supplier: { name: String, contact: String, email: String },
  expiryDate: Date,
  location: String,
  lastRestockedAt: Date,
  transactions: [{
    type: { type: String, enum: ['IN', 'OUT'] },
    quantity: Number,
    reason: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

InventorySchema.pre('save', async function (next) {
  if (!this.itemCode) {
    const count = await mongoose.model('Inventory').countDocuments();
    this.itemCode = 'INV' + String(count + 1).padStart(5, '0');
  }
  this.totalValue = this.quantity * this.unitPrice;
  next();
});

module.exports = mongoose.model('Inventory', InventorySchema);