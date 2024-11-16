const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
  title: String,
  description: String,
  tags: [String],
  images: [String],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Car', CarSchema);
