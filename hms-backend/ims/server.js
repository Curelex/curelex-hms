import app from './app.js';
import mongoose from 'mongoose';
import env from './src/config/env.js';

// Setup Mongoose
mongoose.connect(env.mongoUri)
  .then(() => console.log('IMS MongoDB Connected'))
  .catch(err => console.error('IMS MongoDB Error:', err));

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`IMS Backend server running on port ${PORT}`);
});
