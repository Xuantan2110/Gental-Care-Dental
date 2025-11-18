const mongoose = require('mongoose');
const { Schema } = mongoose;

const billSchema = new Schema({
    medicalRecordId:  { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalRecord', required: true },
    staffId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    dentistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    totalAmount:  { type: mongoose.Types.Decimal128, required: true, min: 0 },
    promotionId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Promotion' },
    discountAmount:  { type: mongoose.Types.Decimal128, default: 0, min: 0 },
    finalAmount:  { type: mongoose.Types.Decimal128, required: true, min: 0 },
    paymentMethod:  { type: String, enum: ['None', 'Cash', 'Bank Transfer'], required: true },
    status:  { type: String, enum: ['Paid', 'Pending', 'Cancelled'], default: 'Pending' },
    cancelReason: { type: String },
    bankTransferContent: { type: String },
    bankTransferInfo: {
        sepayId: Number,
        gateway: String,
        transactionDate: String,
        accountNumber: String,
        referenceCode: String,
        raw: Schema.Types.Mixed  
    },
    serviceItems: [
        {
            serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
            name: { type: String, required: true },
            quantity: { type: Number, default: 1 },
            unitPrice: { type: mongoose.Types.Decimal128, required: true, min: 0 },
            totalPrice: { type: mongoose.Types.Decimal128, required: true, min: 0 },
        }
    ],
    medicineItems: [
        {
            medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
            name: { type: String, required: true },
            quantity: { type: Number, required: true },
            unitPrice: { type: mongoose.Types.Decimal128, required: true, min: 0 },
            totalPrice: { type: mongoose.Types.Decimal128, required: true, min: 0 },
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);