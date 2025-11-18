const mongoose = require('mongoose');
const { Schema } = mongoose;

const medicalRecordSchema = new Schema({
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dentistId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: false },
    chiefComplaint: { type: String },
    medicalHistory: { type: String },
    allergies: { type: String },
    currentMedications: { type: String },
    diagnosis: { type: String },
    recordDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['In Progress', 'Completed', 'Canceled'], default: 'In Progress' },
    servicesUsed: [
        {
            serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
            result: { type: String, required: false },
            toothNumber: { type: String, required: false }
        }
    ],
    prescriptions: [
        {
            medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine', required: true },
            quantity: { type: Number, required: true },
            instructions: { type: String, required: true }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);