// hms-backend/scripts/migrate-add-clinicId.js
// Run ONCE: node scripts/migrate-add-clinicId.js
// This groups existing users by email domain / first admin found and
// assigns them to a clinic so old data isn't lost.

require('dotenv').config();
const mongoose = require('mongoose');
const Clinic   = require('../models/Clinic');
const User     = require('../models/User');

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Find all users that have no clinicId yet
  const orphans = await User.find({ clinicId: { $exists: false } });
  if (!orphans.length) {
    console.log('No users without clinicId found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`Found ${orphans.length} users without clinicId`);

  // Create a single "Legacy Clinic" to house all pre-existing data
  let legacyClinic = await Clinic.findOne({ name: 'Legacy Clinic' });
  if (!legacyClinic) {
    legacyClinic = await Clinic.create({
      name:  'Legacy Clinic',
      email: 'legacy@clinic.local',
    });
    console.log('Created Legacy Clinic:', legacyClinic._id);
  }

  // Assign all orphan users to the legacy clinic
  const result = await User.updateMany(
    { clinicId: { $exists: false } },
    { $set: { clinicId: legacyClinic._id } }
  );

  console.log(`✅ Updated ${result.modifiedCount} users with clinicId: ${legacyClinic._id}`);
  console.log('Migration complete. You can now log in with the legacy admin account.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});