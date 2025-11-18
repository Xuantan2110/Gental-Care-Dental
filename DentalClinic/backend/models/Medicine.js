const mongoose = require('mongoose');
const { Schema } = mongoose;

const medicineSchema = new Schema({
  medicineCategory: { type: Schema.Types.ObjectId, ref: 'MedicineCategory', required: true },
  name:  { type: String, required: true },
  unit:  { type: String, required: true },
  price: { type: Number, required: true },
  origin: { type: String, required: true },
  manufacturer: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Medicine', medicineSchema);
