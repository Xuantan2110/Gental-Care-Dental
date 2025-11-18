const mongoose = require('mongoose');
const { Schema } = mongoose;

const dentistWorkingTime = new Schema({
    dentistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: null },
    workingDays: { type: [Number], default: [2, 3, 4, 5, 6]},
    morning: {
        startTime: { type: String, default: null },
        endTime: { type: String, default: null }
    },
    afternoon: {
        startTime: { type: String, default: null },
        endTime: { type: String, default: null }
    },
    isClosed: { type: Boolean, default: false },
    isFixed: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('DentistWorkingTime', dentistWorkingTime);