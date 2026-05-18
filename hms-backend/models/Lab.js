// hms-backend/models/Lab.js
const mongoose = require('mongoose');

const LabSchema = new mongoose.Schema({
  labId: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  orderedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tests: [{
    testName:       { type: String, required: true },
    testCode:       String,
    category:       { type: String, enum: ['Blood', 'Urine', 'Imaging', 'Microbiology', 'Other'], default: 'Blood' },
    price:          { type: Number, default: 0 },
    result:         String,
    referenceRange: String,
    unit:           String,
    status:         { type: String, enum: ['Pending', 'Processing', 'Completed'], default: 'Pending' },
  }],
  totalAmount:        { type: Number, default: 0 },
  priority:           { type: String, enum: ['Normal', 'Urgent', 'STAT'], default: 'Normal' },
  sampleCollectedAt:  Date,
  reportGeneratedAt:  Date,
  status: {
    type: String,
    enum: ['Ordered', 'Sample Collected', 'Processing', 'Completed', 'Cancelled'],
    default: 'Ordered',
  },
  remarks: String,
}, { timestamps: true });

LabSchema.pre('save', async function (next) {
  if (!this.labId) {
    const count = await mongoose.model('Lab').countDocuments();
    this.labId = 'LAB' + String(count + 1).padStart(5, '0');
  }
  next();
});

module.exports = mongoose.model('Lab', LabSchema);