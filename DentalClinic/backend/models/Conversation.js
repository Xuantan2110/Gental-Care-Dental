const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  staffIds:   [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessage: { type: String, default: '' },
  lastSender: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Conversation', conversationSchema);