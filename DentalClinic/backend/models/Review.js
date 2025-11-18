const mongoose = require('mongoose');
const { Schema } = mongoose;

const reviewSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User', required: true  },
  rating:  { type: Number, min: 1, max: 5 },
  comment: String,
  date: Date
}, { timestamps: true });

reviewSchema.index({ customer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);