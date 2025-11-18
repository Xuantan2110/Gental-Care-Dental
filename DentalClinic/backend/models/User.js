const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  phoneNumber: { type: String },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: { type: Date },
  address: { type: String },
  role: { type: String, enum: ['Customer', 'Dentist', 'Admin', 'Staff'], default: 'Customer' },
  avatar: { type: String, default: 'https://static.vecteezy.com/system/resources/previews/009/734/569/original/default-avatar-profile-icon-social-media-user-photo-vector.jpg' },
  password: { type: String},
  firstLogin: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);