const Bill = require('../models/Bill');
const User = require('../models/User');
const Promotion = require('../models/Promotion');
const socket = require('../config/socket');

function normalizeString(str) {
    return str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase();
}

const getIo = socket?.getIo;

const bankTranferController = {
    getQrCode: async (req, res) => {
        try {
            const { billId, promotionId } = req.params;

            const bill = await Bill.findById(billId);
            if (!bill) {
                return res.status(404).json({ message: "Bill does not exist" });
            }

            const promotion = promotionId && promotionId !== "null"
                ? await Promotion.findById(promotionId)
                : null;

            const customer = await User.findById(bill.customerId);
            if (!customer) {
                return res.status(404).json({ message: "Customer information not found" });
            }

            const totalAmount = Number(bill.totalAmount.toString());

            let discountAmount = 0;

            if (promotion) {
                if (promotion.discountType === "percentage") {
                    discountAmount = (totalAmount * Number(promotion.discountValue)) / 100;
                } else if (promotion.discountType === "fixed") {
                    discountAmount = Number(promotion.discountValue);
                }

                if (discountAmount > totalAmount) discountAmount = totalAmount;
            }

            const finalAmount = totalAmount - discountAmount;

            const customerString = normalizeString(customer.fullName);
            const description = `${customerString}${bill._id.toString().slice(-6)}`;

            const SEPAY_ACC = process.env.SEPAY_ACC;
            const SEPAY_BANK = process.env.SEPAY_BANK;

            const qrUrl = `https://qr.sepay.vn/img?acc=${SEPAY_ACC}&bank=${SEPAY_BANK}&amount=${finalAmount}&des=${description}`;

            bill.promotionId = promotion ? promotion._id : null;
            bill.discountAmount = discountAmount;
            bill.finalAmount = finalAmount;
            bill.paymentMethod = 'Bank Transfer';
            bill.status = 'Pending';
            bill.bankTransferContent = description;

            await bill.save();

            return res.status(200).json({
                message: "QR code created successfully",
                data: {
                    billId: bill._id,
                    totalAmount,
                    discountAmount,
                    finalAmount,
                    promotionId: promotion ? promotion._id : null,
                    description,
                    qrUrl
                }
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({ message: "Fail server!" });
        }
    },

    sepayWebhook: async (req, res) => {
        try {
            const authHeader = req.headers['authorization'] || req.headers['Authorization'];
            if (!authHeader || !authHeader.startsWith('Apikey ')) {
                return res.status(401).json({ success: false, message: 'Invalid authorization header' });
            }

            const apiKey = authHeader.substring('Apikey '.length).trim();
            if (apiKey !== process.env.SEPAY_API_KEY) {
                return res.status(403).json({ success: false, message: 'Invalid API key' });
            }

            const {
                id,
                gateway,
                transactionDate,
                accountNumber,
                content,
                transferType,
                transferAmount,
                referenceCode,
                description
            } = req.body;

            if (transferType !== 'in') {
                return res.status(200).json({ success: true, message: 'Ignore non-in transactions' });
            }

            const rawText = `${content || ''} ${description || ''}`;
            const normalizedWebhookText = normalizeString(rawText);

            const pendingBills = await Bill.find({
                status: 'Pending',
                bankTransferContent: { $exists: true, $ne: null }
            });

            let matchedBill = null;

            for (const b of pendingBills) {
                if (!b.bankTransferContent) continue;

                const token = normalizeString(b.bankTransferContent);

                if (normalizedWebhookText.includes(token)) {
                    matchedBill = b;
                    break;
                }
            }

            if (!matchedBill) {
                console.log('SePay webhook: bill not found for text:', rawText, 'amount:', transferAmount);
                return res.status(200).json({ success: true, message: 'Bill not found, ignored' });
            }

            matchedBill.status = 'Paid';

            matchedBill.bankTransferInfo = {
                sepayId: id,
                gateway,
                transactionDate,
                accountNumber,
                referenceCode,
                raw: req.body
            };

            await matchedBill.save();
            const io = typeof getIo === 'function' ? getIo() : null;
            if (io) {
                io.emit('bankTransferPaid', {
                    billId: matchedBill._id.toString(),
                    status: matchedBill.status,
                    paymentMethod: matchedBill.paymentMethod,
                    finalAmount: matchedBill.finalAmount,
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Webhook processed successfully'
            });

        } catch (error) {
            console.error('SePay webhook error:', error);
            return res.status(500).json({ success: false, message: 'Server error' });
        }
    }
};

module.exports = bankTranferController