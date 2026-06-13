import mongoose from 'mongoose';

const clinicSchema = new mongoose.Schema({
  name: String,
  phone: String,
  whatsapp: String,
  address: String,
  city: String,
  district: String,
  state: String,
});

export default mongoose.models.Clinic || mongoose.model('Clinic', clinicSchema);
