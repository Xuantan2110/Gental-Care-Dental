const mongoose = require('mongoose');
const { Schema } = mongoose;

const dentistProfileSchema = new Schema({
  dentistId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  specialization:  String,
  experienceYears: Number,
  biography:       String,
  education:       String,
  awards:          String
}, { timestamps: true });

module.exports = mongoose.model('DentistProfile', dentistProfileSchema);