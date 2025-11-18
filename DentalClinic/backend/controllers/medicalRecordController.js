const MedicalRecord = require('../models/MedicalRecord');
const mongoose = require('mongoose');
const User = require('../models/User');
const Service = require('../models/Service');
const Medicine = require('../models/Medicine');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const { emitMedicalRecordUpdate, emitBillUpdate } = require('../config/socket');

const D128 = (n) => mongoose.Types.Decimal128.fromString(String(n ?? 0));

const medicalRecordController = {
  createMedicalRecord: async (req, res) => {
    try {
      const {
        customerId,
        appointmentId,
        chiefComplaint,
        medicalHistory,
        allergies,
        currentMedications,
        diagnosis,
        servicesUsed,
        prescriptions
      } = req.body;

      const dentistId = req.user.id;

      if (appointmentId) {
        const appointment = await Appointment.findById(appointmentId)
          .select('status customerId dentistId medicalRecordId')
          .lean();

        if (!appointment) {
          return res.status(404).json({ message: 'Appointment not found' });
        }

        const allowedStatuses = ['confirmed'];
        if (!allowedStatuses.includes(String(appointment.status).toLowerCase())) {
          return res.status(400).json({
            message: `Cannot create medical record because appointment is ${appointment.status}`
          });
        }

        if (String(appointment.customerId) !== String(customerId)) {
          return res.status(400).json({ message: 'Appointment does not belong to this customer' });
        }

        if (appointment.medicalRecordId) {
          return res.status(409).json({
            message: 'Medical record already exists for this appointment',
            recordId: appointment.medicalRecordId
          });
        }

        const existing = await MedicalRecord.findOne({
          appointmentId,
          status: { $in: ['In Progress'] }
        }).select('_id').lean();

        if (existing) {
          return res.status(200).json({
            message: 'Medical record already opened for this appointment',
            record: existing
          });
        }
      }

      const newRecord = new MedicalRecord({
        customerId,
        dentistId,
        appointmentId,
        chiefComplaint,
        medicalHistory,
        allergies,
        currentMedications,
        diagnosis,
        servicesUsed: servicesUsed || [],
        prescriptions: prescriptions || []
      });

      await newRecord.save();

      if (appointmentId) {
        const updated = await Appointment.findOneAndUpdate(
          { _id: appointmentId, medicalRecordId: null },
          { $set: { medicalRecordId: newRecord._id } },
          { new: true }
        ).select('_id medicalRecordId');

        if (!updated) {
          const latest = await Appointment.findById(appointmentId).select('medicalRecordId');
          const linkedId = latest?.medicalRecordId;

          try {
            await MedicalRecord.findByIdAndDelete(newRecord._id);
          } catch { }

          return res.status(409).json({
            message: 'Medical record already exists for this appointment',
            recordId: linkedId || undefined
          });
        }
      }

      return res.status(201).json({
        message: 'Medical record created successfully',
        record: newRecord
      });
    } catch (error) {
      console.error('Error creating medical record:', error);
      return res.status(500).json({
        message: 'An error occurred while creating medical record',
        error
      });
    }
  },

  getBasicMedicalRecords: async (req, res) => {
    try {
      const records = await MedicalRecord.find({}, 'recordDate status customerId dentistId')
        .populate('customerId', 'fullName gender phoneNumber')
        .populate('dentistId', 'fullName phoneNumber')
        .populate('appointmentId', 'date startTime endTime')
        .sort({ createdAt: -1 })
        .lean();

      res.status(200).json({
        message: 'Get medical records successfully',
        records
      });
    } catch (error) {
      console.error('Error fetching medical records:', error);
      res.status(500).json({
        message: 'An error occurred while fetching medical records',
        error
      });
    }
  },

  getMedicalRecordDetail: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid medical record id' });
      }

      const record = await MedicalRecord.findById(id)
        .populate({
          path: 'customerId',
          select: 'fullName gender phoneNumber email address dateOfBirth',
          model: User
        })
        .populate({
          path: 'dentistId',
          select: 'fullName phoneNumber email',
          model: User
        })
        .populate({
          path: 'servicesUsed.serviceId',
          select: 'name price',
          model: Service
        })
        .populate({
          path: 'prescriptions.medicineId',
          select: 'name price',
          model: Medicine
        })
        .lean();

      if (!record) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      return res.status(200).json({
        message: 'Get medical record detail successfully',
        record
      });
    } catch (error) {
      console.error('Error getting medical record detail:', error);
      return res.status(500).json({
        message: 'An error occurred while fetching medical record detail',
        error
      });
    }
  },

  deleteMedicalRecord: async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid medical record id' });
      }

      const record = await MedicalRecord.findById(id);
      if (!record) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      await MedicalRecord.findByIdAndDelete(id);

      return res.status(200).json({
        message: 'Medical record deleted successfully',
        recordId: id
      });
    } catch (error) {
      console.error('Error deleting medical record:', error);
      return res.status(500).json({
        message: 'An error occurred while deleting medical record',
        error
      });
    }
  },

  updateMedicalInfo: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid medical record id' });
      }
      const {
        chiefComplaint,
        medicalHistory,
        allergies,
        currentMedications,
        diagnosis
      } = req.body;

      const textFields = { chiefComplaint, medicalHistory, allergies, currentMedications, diagnosis };
      for (const [key, val] of Object.entries(textFields)) {
        if (typeof val !== 'undefined' && typeof val !== 'string') {
          return res.status(400).json({ message: `${key} must be a string` });
        }
      }

      const record = await MedicalRecord.findById(id).select('dentistId status').lean();
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }
      if (['Completed', 'Cancelled'].includes(record.status)) {
        return res.status(400).json({ message: 'Cannot modify a completed or cancelled medical record' });
      }

      const updates = {};
      const setIf = (k, v) => (typeof v !== 'undefined' ? (updates[k] = v) : null);
      setIf('chiefComplaint', chiefComplaint);
      setIf('medicalHistory', medicalHistory);
      setIf('allergies', allergies);
      setIf('currentMedications', currentMedications);
      setIf('diagnosis', diagnosis);

      const updated = await MedicalRecord.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).lean();

      if (!updated) return res.status(404).json({ message: 'Medical record not found' });

      return res.status(200).json({ message: 'Medical info updated', record: updated });
    } catch (error) {
      console.error('Error updating medical info:', error);
      return res.status(500).json({ message: 'Update medical info failed', error });
    }
  },

  addServiceToMedicalRecord: async (req, res) => {
    try {
      const { id } = req.params;
      const { serviceId, result, toothNumber } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid medical record id' });
      }

      if (!mongoose.isValidObjectId(serviceId)) {
        return res.status(400).json({ message: 'Invalid service id' });
      }

      const record = await MedicalRecord.findById(id).select('status dentistId').lean();
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }
      if (['Completed', 'Cancelled'].includes(record.status)) {
        return res.status(400).json({ message: 'Cannot modify a completed or cancelled medical record' });
      }

      const service = await Service.findById(serviceId).select('_id name').lean();
      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }

      if (typeof result !== 'undefined' && typeof result !== 'string') {
        return res.status(400).json({ message: 'Result must be a string if provided' });
      }

      if (typeof toothNumber !== 'undefined') {
        if (!Number.isInteger(toothNumber) || toothNumber < 1) {
          return res.status(400).json({ message: 'Tooth number must be a positive integer if provided' });
        }
      }
      const updatedRecord = await MedicalRecord.findByIdAndUpdate(
        id,
        {
          $push: {
            servicesUsed: {
              serviceId,
              result: result || null,
              toothNumber: toothNumber || null
            }
          }
        },
        { new: true }
      )
        .populate({ path: 'servicesUsed.serviceId', select: 'name price', model: Service })
        .lean();

      if (!updatedRecord) {
        return res.status(404).json({ message: 'Medical record not found' });
      }

      return res.status(200).json({
        message: 'Service added successfully',
        record: updatedRecord
      });
    } catch (error) {
      console.error('Error adding service:', error);
      return res.status(500).json({
        message: 'An error occurred while adding service',
        error
      });
    }
  },

  removeServiceFromMedicalRecord: async (req, res) => {
    try {
      const { recordId, serviceItemId } = req.params;

      if (!mongoose.isValidObjectId(recordId)) {
        return res.status(400).json({ message: "Invalid medical record id" });
      }

      if (!mongoose.isValidObjectId(serviceItemId)) {
        return res.status(400).json({ message: "Invalid service item id" });
      }

      const record = await MedicalRecord.findById(recordId).select('status dentistId').lean();
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }
      if (['Completed', 'Cancelled'].includes(record.status)) {
        return res.status(400).json({ message: 'Cannot modify a completed or cancelled medical record' });
      }

      const updatedRecord = await MedicalRecord.findByIdAndUpdate(
        recordId,
        { $pull: { servicesUsed: { _id: serviceItemId } } },
        { new: true }
      )
        .populate({ path: "servicesUsed.serviceId", select: "name price", model: Service })
        .lean();

      if (!updatedRecord) {
        return res.status(404).json({ message: "Medical record not found" });
      }

      return res.status(200).json({
        message: "Service removed successfully",
        record: updatedRecord,
      });
    } catch (error) {
      console.error("Error removing service:", error);
      return res.status(500).json({
        message: "An error occurred while removing service",
        error,
      });
    }
  },

  addPrescriptionToMedicalRecord: async (req, res) => {
    try {
      const { id } = req.params;
      const { medicineId, quantity, instructions } = req.body;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: "Invalid medical record id" });
      }
      if (!mongoose.isValidObjectId(medicineId)) {
        return res.status(400).json({ message: "Invalid medicine id" });
      }
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive integer" });
      }
      if (!instructions || typeof instructions !== "string") {
        return res.status(400).json({ message: "Instructions are required and must be a string" });
      }

      const record = await MedicalRecord.findById(id).select('status dentistId').lean();
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }
      if (['Completed', 'Cancelled'].includes(record.status)) {
        return res.status(400).json({ message: 'Cannot modify a completed or cancelled medical record' });
      }

      const medicine = await Medicine.findById(medicineId).select("_id");
      if (!medicine) {
        return res.status(404).json({ message: "Medicine not found" });
      }

      const updated = await MedicalRecord.findByIdAndUpdate(
        id,
        { $push: { prescriptions: { medicineId, quantity, instructions } } },
        { new: true }
      )
        .populate({ path: "prescriptions.medicineId", select: "name" })
        .lean();

      if (!updated) return res.status(404).json({ message: "Medical record not found" });

      res.status(200).json({
        message: "Prescription item added successfully",
        record: updated,
      });
    } catch (error) {
      console.error("Error adding prescription:", error);
      res.status(500).json({
        message: "An error occurred while adding prescription item",
        error,
      });
    }
  },

  removePrescriptionFromMedicalRecord: async (req, res) => {
    try {
      const { recordId, prescriptionItemId } = req.params;

      if (!mongoose.isValidObjectId(recordId)) {
        return res.status(400).json({ message: "Invalid medical record id" });
      }
      if (!mongoose.isValidObjectId(prescriptionItemId)) {
        return res.status(400).json({ message: "Invalid prescription item id" });
      }

      const record = await MedicalRecord.findById(recordId).select('status dentistId').lean();
      if (!record) return res.status(404).json({ message: 'Medical record not found' });
      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }
      if (['Completed', 'Cancelled'].includes(record.status)) {
        return res.status(400).json({ message: 'Cannot modify a completed or cancelled medical record' });
      }

      const updated = await MedicalRecord.findByIdAndUpdate(
        recordId,
        { $pull: { prescriptions: { _id: prescriptionItemId } } },
        { new: true }
      )
        .populate({ path: "prescriptions.medicineId", select: "name" })
        .lean();

      if (!updated) return res.status(404).json({ message: "Medical record not found" });

      res.status(200).json({
        message: "Prescription item removed successfully",
        record: updated,
      });
    } catch (error) {
      console.error("Error removing prescription:", error);
      res.status(500).json({
        message: "An error occurred while removing prescription item",
        error,
      });
    }
  },

  finishMedicalRecord: async (req, res) => {
    const session = await mongoose.startSession();
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid medical record id' });
      }

      const record = await MedicalRecord.findById(id)
        .select('dentistId status appointmentId')
        .lean();

      if (!record) return res.status(404).json({ message: 'Medical record not found' });

      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }
      if (record.status === 'Completed') {
        return res.status(400).json({ message: 'Medical record already completed' });
      }
      if (record.status === 'Cancelled') {
        return res.status(400).json({ message: 'Cannot complete a cancelled record' });
      }

      session.startTransaction();

      const updated = await MedicalRecord.findByIdAndUpdate(
        id,
        { $set: { status: 'Completed' } },
        { new: true, session }
      )
        .populate('customerId', 'fullName phoneNumber')
        .populate('dentistId', 'fullName phoneNumber')
        .populate({ path: 'servicesUsed.serviceId', select: 'name price' })
        .populate({ path: 'prescriptions.medicineId', select: 'name price' })
        .lean();

      const existed = await Bill.findOne({
        medicalRecordId: id,
        status: { $in: ['Pending', 'Paid'] }
      }).session(session).lean();

      if (existed) {
        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({
          message: 'Medical record finished (Completed). Bill already exists for this record.',
          record: updated,
          bill: existed
        });
      }

      const services = Array.isArray(updated.servicesUsed) ? updated.servicesUsed : [];
      const meds = Array.isArray(updated.prescriptions) ? updated.prescriptions : [];

      const serviceItems = [];
      let subtotalServices = 0;
      for (const s of services) {
        const srv = s.serviceId;
        const name = s?.name || srv?.name;
        const unit = Number(s?.price ?? srv?.price ?? 0);
        const qty = Number(s?.quantity ?? 1);
        const lineTotal = unit * qty;

        if (!name || lineTotal <= 0) continue;

        subtotalServices += lineTotal;
        serviceItems.push({
          serviceId: srv?._id || s.serviceId,
          name,
          quantity: qty,
          unitPrice: D128(unit),
          totalPrice: D128(lineTotal),
        });
      }

      const medicineItems = [];
      let subtotalMeds = 0;
      for (const p of meds) {
        const med = p.medicineId;
        const name = p?.name || med?.name;
        const unit = Number(p?.price ?? med?.price ?? 0);
        const qty = Number(p?.quantity ?? 0);
        const lineTotal = unit * qty;

        if (!name || lineTotal <= 0) continue;

        subtotalMeds += lineTotal;
        medicineItems.push({
          medicineId: med?._id || p.medicineId,
          name,
          quantity: qty,
          unitPrice: D128(unit),
          totalPrice: D128(lineTotal),
        });
      }

      const totalAmountNum = subtotalServices + subtotalMeds;

      if (totalAmountNum <= 0) {
        await session.commitTransaction();
        session.endSession();
        return res.status(200).json({
          message: 'Medical record finished (Completed). No bill created because total is zero.',
          record: updated
        });
      }

      const customerId = updated?.customerId?._id || updated?.customerId;
      if (!customerId) {
        await session.commitTransaction();
        session.endSession();
        return res.status(400).json({
          message: 'Medical record finished (Completed) but missing customerId; bill not created'
        });
      }

      const [bill] = await Bill.create([{
        medicalRecordId: updated._id,
        dentistId: updated.dentistId?._id || updated.dentistId,
        customerId,
        totalAmount: D128(totalAmountNum),
        promotionId: undefined,
        discountAmount: D128(0),
        finalAmount: D128(totalAmountNum),
        paymentMethod: 'None',
        status: 'Pending',
        serviceItems,
        medicineItems
      }], { session });

      await session.commitTransaction();
      session.endSession();

      // Emit socket event for real-time update
      try {
        if (updated) {
          emitMedicalRecordUpdate(updated, 'completed');
        }
        // Also emit bill creation event
        if (bill) {
          const populatedBill = await Bill.findById(bill._id)
            .populate('customerId', 'fullName phoneNumber email')
            .populate('dentistId', 'fullName email')
            .lean();
          if (populatedBill) {
            // Convert Decimal128 to numbers for frontend
            const convert = v => (v && v.$numberDecimal ? Number(v.$numberDecimal) : Number(v || 0));
            populatedBill.totalAmount = convert(populatedBill.totalAmount);
            populatedBill.discountAmount = convert(populatedBill.discountAmount);
            populatedBill.finalAmount = convert(populatedBill.finalAmount);
            emitBillUpdate(populatedBill, 'created');
            
            // Create notification for staff
            const { notifyNewBill } = require('./notificationController');
            try {
              await notifyNewBill(populatedBill);
            } catch (notifError) {
              console.error('Error creating notification for new bill:', notifError);
            }
          }
        }
      } catch (socketError) {
        console.error('Error emitting medical record complete event:', socketError);
      }

      return res.status(200).json({
        message: 'Medical record finished (Completed) & bill created (Pending).',
        record: updated,
        bill
      });
    } catch (error) {
      try { await session.abortTransaction(); } catch { }
      session.endSession();
      console.error('Error finishing medical record:', error);
      return res.status(500).json({
        message: 'Finish medical record failed',
        error: { name: error.name, message: error.message }
      });
    }
  },

  cancelMedicalRecord: async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid medical record id' });
      }

      const record = await MedicalRecord.findById(id)
        .select('dentistId status appointmentId')
        .lean();
      if (!record) return res.status(404).json({ message: 'Medical record not found' });

      if (String(record.dentistId) !== String(req.user.id) && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Not allowed' });
      }

      if (record.status === 'Cancelled') {
        return res.status(400).json({ message: 'Medical record already cancelled' });
      }
      if (record.status === 'Completed') {
        return res.status(400).json({ message: 'Cannot cancel a completed record' });
      }

      const updated = await MedicalRecord.findByIdAndUpdate(
        id,
        { $set: { status: 'Cancelled' } },
        { new: true }
      )
        .populate('customerId', 'fullName phoneNumber')
        .populate('dentistId', 'fullName phoneNumber')
        .lean();

      return res.status(200).json({
        message: 'Medical record cancelled (Cancelled)',
        record: updated,
      });
    } catch (error) {
      console.error('Error cancelling medical record:', error);
      return res.status(500).json({ message: 'Cancel medical record failed', error });
    }
  },

  getMedicalRecordByCustomer: async (req, res) => {
    try {
      const customerId = req.user.id;

      if (!mongoose.isValidObjectId(customerId)) {
        return res.status(400).json({ message: "Invalid customer id" });
      }

      const records = await MedicalRecord.find({ customerId })
        .populate({
          path: "customerId",
          select: "fullName gender phoneNumber email dateOfBirth address",
          model: User
        })
        .populate({
          path: "dentistId",
          select: "fullName phoneNumber email",
          model: User
        })
        .populate({
          path: "servicesUsed.serviceId",
          select: "name price",
          model: Service
        })
        .populate({
          path: "prescriptions.medicineId",
          select: "name price",
          model: Medicine
        })
        .populate({
          path: "appointmentId",
          select: "date startTime endTime status",
          model: Appointment
        })
        .sort({ createdAt: -1 })
        .lean();

      return res.status(200).json({
        message: "Get medical records by customer successfully",
        records
      });

    } catch (error) {
      console.error("Error fetching medical records by customer:", error);
      return res.status(500).json({
        message: "An error occurred while fetching medical records",
        error
      });
    }
  }

};

module.exports = medicalRecordController;