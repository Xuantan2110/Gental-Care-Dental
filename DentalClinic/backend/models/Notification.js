const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { 
    type: String, 
    enum: ['new_appointment', 'appointment_confirmed', 'appointment_rejected', 'new_bill'], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  relatedId: { type: Schema.Types.ObjectId, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);