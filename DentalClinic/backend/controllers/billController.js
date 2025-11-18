const Bill = require('../models/Bill');
const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');
const { emitBillUpdate } = require('../config/socket');

const billController = {
    payBill: async (req, res) => {
        try {
            const { id } = req.params;
            const { paymentMethod, promotionId } = req.body;
            const staffId = req.user.id;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: 'Invalid bill id' });
            }

            const bill = await Bill.findById(id);
            if (!bill) return res.status(404).json({ message: 'Bill not found' });

            if (bill.status === 'Paid') {
                return res.status(400).json({ message: 'Bill already paid' });
            }

            const validMethods = ['Cash', 'Bank Transfer'];
            if (!validMethods.includes(paymentMethod)) {
                return res.status(400).json({ message: 'Invalid payment method' });
            }

            if (promotionId === null || promotionId === '' || typeof promotionId === 'undefined') {
                bill.promotionId = undefined;
            } else {
                if (!mongoose.isValidObjectId(promotionId)) {
                    return res.status(400).json({ message: 'Invalid promotion id' });
                }
                bill.promotionId = promotionId;
            }

            const toNum = (v) =>
                typeof v === 'object' && v !== null && v._bsontype === 'Decimal128'
                    ? Number(v.toString())
                    : Number(v || 0);

            let finalAmount = toNum(bill.totalAmount);
            let discountAmount = 0;

            if (bill.promotionId) {
                const promo = await Promotion.findById(bill.promotionId).lean();
                if (promo) {
                    if (promo.discountType === 'percentage') {
                        discountAmount = (finalAmount * Number(promo.discountValue || 0)) / 100;
                    } else if (promo.discountType === 'fixed') {
                        discountAmount = Number(promo.discountValue || 0);
                    }
                    if (discountAmount > finalAmount) discountAmount = finalAmount;
                    finalAmount -= discountAmount;
                }
            }

            bill.staffId = staffId;
            bill.paymentMethod = paymentMethod;
            bill.discountAmount = mongoose.Types.Decimal128.fromString(String(discountAmount));
            bill.finalAmount = mongoose.Types.Decimal128.fromString(String(finalAmount));
            bill.status = 'Paid';

            const updated = await bill.save();

            // Populate bill for socket emission
            const populatedBill = await Bill.findById(updated._id)
                .populate('customerId', 'fullName phoneNumber email')
                .populate('staffId', 'fullName email')
                .populate('dentistId', 'fullName email')
                .lean();

            // Emit socket event for real-time update
            try {
                if (populatedBill) {
                    // Convert Decimal128 to numbers for frontend
                    const convert = v => (v && v.$numberDecimal ? Number(v.$numberDecimal) : Number(v || 0));
                    populatedBill.totalAmount = convert(populatedBill.totalAmount);
                    populatedBill.discountAmount = convert(populatedBill.discountAmount);
                    populatedBill.finalAmount = convert(populatedBill.finalAmount);
                    emitBillUpdate(populatedBill, 'paid');
                }
            } catch (socketError) {
                console.error('Error emitting bill paid event:', socketError);
            }

            return res.status(200).json({
                message: 'Bill paid successfully',
                bill: updated,
            });
        } catch (error) {
            console.error('Error paying bill:', error);
            return res.status(500).json({
                message: 'An error occurred while paying bill',
                error,
            });
        }
    },

    getAllBills: async (req, res) => {
        try {
            const bills = await Bill.find()
                .select('customerId totalAmount discountAmount finalAmount paymentMethod status')
                .populate('customerId', 'fullName avatar')
                .sort({ createdAt: -1 })
                .lean();

            if (!bills.length) {
                return res.status(200).json({ message: 'No bills found', bills: [] });
            }

            const data = bills.map(b => ({
                _id: b._id,
                customer: b.customerId
                    ? { _id: b.customerId._id, fullName: b.customerId.fullName, phoneNumber: b.customerId.phoneNumber }
                    : null,
                totalAmount: Number(b.totalAmount?.$numberDecimal ?? b.totalAmount ?? 0),
                discountAmount: Number(b.discountAmount?.$numberDecimal ?? b.discountAmount ?? 0),
                finalAmount: Number(b.finalAmount?.$numberDecimal ?? b.finalAmount ?? 0),
                paymentMethod: b.paymentMethod,
                status: b.status,
                cancelReason: b.cancelReason,
                createdAt: b.createdAt,
            }));

            return res.status(200).json({
                message: 'Get all bills successfully',
                count: data.length,
                bills: data,
            });
        } catch (error) {
            console.error('getAllBills error:', error);
            return res.status(500).json({
                message: 'Failed to get bills',
                error,
            });
        }
    },

    getBillById: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: 'Invalid bill id' });
            }

            const bill = await Bill.findById(id)
                .populate('customerId', 'fullName phoneNumber email address')
                .populate('staffId', 'fullName phoneNumber email')
                .populate('promotionId', 'name discountType discountValue startDate endDate')
                .populate('dentistId', 'fullName phoneNumber email')
                .lean();

            if (!bill) {
                return res.status(404).json({ message: 'Bill not found' });
            }

            const convert = v => (v && v.$numberDecimal ? Number(v.$numberDecimal) : v);
            bill.totalAmount = convert(bill.totalAmount);
            bill.discountAmount = convert(bill.discountAmount);
            bill.finalAmount = convert(bill.finalAmount);
            bill.serviceItems?.forEach(i => {
                i.unitPrice = convert(i.unitPrice);
                i.totalPrice = convert(i.totalPrice);
            });
            bill.medicineItems?.forEach(i => {
                i.unitPrice = convert(i.unitPrice);
                i.totalPrice = convert(i.totalPrice);
            });

            return res.status(200).json({
                message: 'Get bill successfully',
                bill,
            });
        } catch (error) {
            console.error('getBillById error:', error);
            return res.status(500).json({
                message: 'Failed to get bill',
                error,
            });
        }
    },

    deleteBill: async (req, res) => {
        try {
            const { id } = req.params;
            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: 'Invalid bill id' });
            }

            const bill = await Bill.findById(id);
            if (!bill) {
                return res.status(404).json({ message: 'Bill not found' });
            }
            if (bill.status === 'Paid') {
                return res.status(400).json({ message: 'Cannot delete a paid bill' });
            }

            await Bill.findByIdAndDelete(id);

            return res.status(200).json({
                message: 'Bill deleted successfully',
                deletedId: id
            });
        } catch (error) {
            console.error('Error deleting bill:', error);
            return res.status(500).json({
                message: 'An error occurred while deleting bill',
                error
            });
        }
    },

    getBillsByCustomer: async (req, res) => {
        try {
            const customerId = req.user.id;

            if (!mongoose.isValidObjectId(customerId)) {
                return res.status(400).json({ message: "Invalid customer id" });
            }

            const bills = await Bill.find({ customerId })
                .populate("customerId", "fullName phoneNumber email avatar")
                .populate("staffId", "fullName email")
                .populate("promotionId", "name discountType discountValue")
                .sort({ createdAt: -1 })
                .lean();

            if (!bills.length) {
                return res.status(200).json({ message: "No bills found", bills: [] });
            }

            const convert = v =>
                v && v.$numberDecimal ? Number(v.$numberDecimal) : Number(v || 0);

            const data = bills.map(bill => ({
                _id: bill._id,
                customer: bill.customerId
                    ? {
                        _id: bill.customerId._id,
                        fullName: bill.customerId.fullName,
                        phoneNumber: bill.customerId.phoneNumber,
                        avatar: bill.customerId.avatar,
                        email: bill.customerId.email,
                    }
                    : null,

                totalAmount: convert(bill.totalAmount),
                discountAmount: convert(bill.discountAmount),
                finalAmount: convert(bill.finalAmount),
                paymentMethod: bill.paymentMethod,
                status: bill.status,
                cancelReason: bill.cancelReason,
                createdAt: bill.createdAt,

                staff: bill.staffId
                    ? {
                        _id: bill.staffId._id,
                        fullName: bill.staffId.fullName,
                        email: bill.staffId.email,
                    }
                    : null,

                promotion: bill.promotionId
                    ? {
                        _id: bill.promotionId._id,
                        name: bill.promotionId.name,
                        discountType: bill.promotionId.discountType,
                        discountValue: bill.promotionId.discountValue,
                    }
                    : null,
            }));

            return res.status(200).json({
                message: "Get bills by customer successfully",
                count: data.length,
                bills: data,
            });

        } catch (error) {
            console.error("Error fetching bills by customer:", error);
            return res.status(500).json({
                message: "An error occurred while fetching bills",
                error,
            });
        }
    },

    cancelBill: async (req, res) => {
        try {
            const { id } = req.params;
            const { cancelReason } = req.body;
            const staffId = req.user.id;

            if (!mongoose.isValidObjectId(id)) {
                return res.status(400).json({ message: 'Invalid bill id' });
            }

            if (!cancelReason || typeof cancelReason !== 'string' || cancelReason.trim().length === 0) {
                return res.status(400).json({ message: 'Cancel reason is required' });
            }

            const bill = await Bill.findById(id);
            if (!bill) {
                return res.status(404).json({ message: 'Bill not found' });
            }

            if (bill.status === 'Paid') {
                return res.status(400).json({ message: 'Cannot cancel a paid bill' });
            }

            if (bill.status === 'Cancelled') {
                return res.status(400).json({ message: 'Bill is already cancelled' });
            }

            bill.status = 'Cancelled';
            bill.cancelReason = cancelReason.trim();
            bill.staffId = staffId;

            const updated = await bill.save();

            // Populate bill for socket emission
            const populatedBill = await Bill.findById(updated._id)
                .populate('customerId', 'fullName phoneNumber email')
                .populate('staffId', 'fullName email')
                .populate('dentistId', 'fullName email')
                .lean();

            // Emit socket event for real-time update
            try {
                if (populatedBill) {
                    // Convert Decimal128 to numbers for frontend
                    const convert = v => (v && v.$numberDecimal ? Number(v.$numberDecimal) : Number(v || 0));
                    populatedBill.totalAmount = convert(populatedBill.totalAmount);
                    populatedBill.discountAmount = convert(populatedBill.discountAmount);
                    populatedBill.finalAmount = convert(populatedBill.finalAmount);
                    emitBillUpdate(populatedBill, 'cancelled');
                }
            } catch (socketError) {
                console.error('Error emitting bill cancelled event:', socketError);
            }

            return res.status(200).json({
                message: 'Bill cancelled successfully',
                bill: updated,
            });
        } catch (error) {
            console.error('Error cancelling bill:', error);
            return res.status(500).json({
                message: 'An error occurred while cancelling bill',
                error,
            });
        }
    },

};

module.exports = billController;
