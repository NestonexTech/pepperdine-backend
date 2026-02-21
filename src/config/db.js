const mongoose = require('mongoose');
function connectDB() {
  const uri = process.env.MONGO_URI || '';
  mongoose.set('strictQuery', true);
  if (!uri) {
    console.warn('MongoDB URI is not defined');
    return;
  }
  mongoose
    .connect(uri, { autoIndex: true })
    .then(() => {
      console.log('MongoDB connected');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err && err.message);
    });
}
module.exports = { connectDB };
