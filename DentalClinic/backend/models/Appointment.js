const mongoose = require('mongoose');
const { Schema } = mongoose;

const appointmentSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dentistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: Date,
  endTime: Date,
  bookAt: { type: Date, default: Date.now },
  date: { type: Date, required: true },
  service: [
    {
      serviceId: { type: Schema.Types.ObjectId, ref: 'Service', required: true },
      name: { type: String, required: true },
    }
  ],
  note: String,
  status: { type: String, enum: ['pending', 'confirmed', 'rejected'], default: 'pending' },
  decision: {
    confirmedAt: { type: Date, default: null },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    rejectReason: { type: String, trim: true, maxlength: 500, default: null },
  },
  medicalRecordId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord', default: null },
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);