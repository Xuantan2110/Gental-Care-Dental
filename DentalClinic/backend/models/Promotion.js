const mongoose = require('mongoose');
const { Schema } = mongoose;

const promotionSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
}, { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } });

promotionSchema.virtual('status').get(function () {
    const now = new Date();
    if (now < this.startDate) return 'UpComing';
    if (now > this.endDate) return 'Expired';
    return 'Ongoing';
});

module.exports = mongoose.model('Promotion', promotionSchema);