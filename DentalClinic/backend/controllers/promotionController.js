const mongoose = require('mongoose');
const Promotion = require('../models/Promotion');

const isValidId = (id) => mongoose.isValidObjectId(id);

const validatePayload = ({ discountType, discountValue, startDate, endDate }) => {
    if (discountType === 'percentage') {
        if (typeof discountValue !== 'number' || discountValue < 0 || discountValue > 100) {
            return 'For percentage, discountValue must be a number between 0 and 100';
        }
    }
    if (discountType === 'fixed') {
        if (typeof discountValue !== 'number' || discountValue < 0) {
            return 'For fixed, discountValue must be a non-negative number';
        }
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        return 'endDate must be greater than or equal to startDate';
    }
    return null;
};

const promotionController = {
    createPromotion: async (req, res) => {
        try {
            const { name, description, discountType, discountValue, startDate, endDate } = req.body;
            if (!name || !name.trim()) {
                return res.status(400).json({ message: 'Name is required.' });
            }

            if (!description || !description.trim()) {
                return res.status(400).json({ message: 'Description is required.' });
            }

            if (!discountType) {
                return res.status(400).json({ message: 'Discount type is required.' });
            }

            if (!['percentage', 'fixed'].includes(discountType)) {
                return res.status(400).json({ message: 'Discount type must be either "percentage" or "fixed".' });
            }

            if (discountValue === undefined || discountValue === null) {
                return res.status(400).json({ message: 'Discount value is required.' });
            }

            const value = Number(discountValue);
            if (isNaN(value) || value <= 0) {
                return res.status(400).json({ message: 'Discount value must be a positive number.' });
            }

            if (discountType === 'percentage' && value > 100) {
                return res.status(400).json({ message: 'Percentage discount cannot exceed 100%.' });
            }
            if (!startDate) {
                return res.status(400).json({ message: 'Start date is required.' });
            }

            if (!endDate) {
                return res.status(400).json({ message: 'End date is required.' });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            const now = new Date();

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                return res.status(400).json({ message: 'Invalid date format.' });
            }

            if (end < start) {
                return res.status(400).json({ message: 'End date cannot be before start date.' });
            }

            if (end < now) {
                return res.status(400).json({ message: 'End date cannot be in the past.' });
            }
            const promo = new Promotion({
                name,
                description,
                discountType,
                discountValue: value,
                startDate,
                endDate,
            });

            await promo.save();
            const created = await Promotion.findById(promo._id).lean({ virtuals: true });

            return res.status(201).json({
                message: 'Create promotion successfully',
                promotion: created,
            });

        } catch (error) {
            console.error('createPromotion error:', error);
            return res.status(500).json({
                message: 'Failed to create promotion',
                error,
            });
        }
    },

    getAllPromotion: async (req, res) => {
        try {
            const docs = await Promotion.find().sort({ createdAt: -1 });
            const promotions = docs.map(d => d.toObject({ virtuals: true }));

            return res.status(200).json({ message: 'Get promotions successfully', promotions });
        } catch (error) {
            console.error('getAllPromotion error:', error);
            return res.status(500).json({ message: 'Failed to get promotions', error });
        }
    },

    getOngoingPromotions: async (req, res) => {
        try {
            const now = new Date();

            const promotions = await Promotion.find({
                startDate: { $lte: now },
                endDate: { $gte: now }
            })
                .sort({ createdAt: -1 })
                .lean({ virtuals: true });

            if (!promotions.length) {
                return res.status(200).json({
                    message: 'No active promotions at the moment',
                    promotions: []
                });
            }

            return res.status(200).json({
                message: 'Get active promotions successfully',
                promotions
            });
        } catch (error) {
            console.error('getActivePromotions error:', error);
            return res.status(500).json({
                message: 'Failed to get active promotions',
                error
            });
        }
    },

    getPromotionById: async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidId(id)) return res.status(400).json({ message: 'Invalid promotion id' });

            const promotion = await Promotion.findById(id).lean({ virtuals: true });
            if (!promotion) return res.status(404).json({ message: 'Promotion not found' });

            return res.status(200).json({ message: 'Get promotion successfully', promotion });
        } catch (error) {
            console.error('getPromotionById error:', error);
            return res.status(500).json({ message: 'Failed to get promotion', error });
        }
    },

    updatePromotion: async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidId(id)) {
                return res.status(400).json({ message: 'Invalid promotion id' });
            }
            const allowed = ['name', 'description', 'discountType', 'discountValue', 'startDate', 'endDate'];
            const payload = {};
            for (const key of allowed) {
                if (typeof req.body[key] !== 'undefined') payload[key] = req.body[key];
            }
            if (Object.keys(payload).length === 0) {
                return res.status(400).json({ message: 'No valid fields to update' });
            }
            const current = await Promotion.findById(id).lean();
            if (!current) return res.status(404).json({ message: 'Promotion not found' });
            if ('name' in payload && (!payload.name || !String(payload.name).trim())) {
                return res.status(400).json({ message: 'Name is required.' });
            }
            if ('description' in payload && (!payload.description || !String(payload.description).trim())) {
                return res.status(400).json({ message: 'Description is required.' });
            }

            const effectiveDiscountType = ('discountType' in payload) ? payload.discountType : current.discountType;
            if ('discountType' in payload && !['percentage', 'fixed'].includes(payload.discountType)) {
                return res.status(400).json({ message: 'Discount type must be either "percentage" or "fixed".' });
            }

            let effectiveDiscountValue =
                ('discountValue' in payload) ? payload.discountValue : current.discountValue;

            if ('discountValue' in payload) {
                const v = Number(payload.discountValue);
                if (isNaN(v) || v <= 0) {
                    return res.status(400).json({ message: 'Discount value must be a positive number.' });
                }
                effectiveDiscountValue = v;
            } else if (effectiveDiscountValue === undefined || effectiveDiscountValue === null) {
                return res.status(400).json({ message: 'Discount value is required.' });
            }

            if (effectiveDiscountType === 'percentage') {
                const v = Number(effectiveDiscountValue);
                if (isNaN(v) || v <= 0) {
                    return res.status(400).json({ message: 'Discount value must be a positive number.' });
                }
                if (v > 100) {
                    return res.status(400).json({ message: 'Percentage discount cannot exceed 100%.' });
                }
            }

            const effectiveStart = ('startDate' in payload) ? new Date(payload.startDate) : new Date(current.startDate);
            const effectiveEnd = ('endDate' in payload) ? new Date(payload.endDate) : new Date(current.endDate);
            if ('startDate' in payload && isNaN(effectiveStart.getTime())) {
                return res.status(400).json({ message: 'Invalid start date format.' });
            }
            if ('endDate' in payload && isNaN(effectiveEnd.getTime())) {
                return res.status(400).json({ message: 'Invalid end date format.' });
            }

            if (!isNaN(effectiveStart.getTime()) && !isNaN(effectiveEnd.getTime())) {
                if (effectiveEnd < effectiveStart) {
                    return res.status(400).json({ message: 'End date cannot be before start date.' });
                }
                const now = new Date();
                if (effectiveEnd < now) {
                    return res.status(400).json({ message: 'End date cannot be in the past.' });
                }
            }

            if ('discountValue' in payload) {
                payload.discountValue = Number(payload.discountValue);
            }
            const updated = await Promotion.findByIdAndUpdate(
                id,
                { $set: payload },
                { new: true, runValidators: true }
            ).lean({ virtuals: true });

            if (!updated) return res.status(404).json({ message: 'Promotion not found' });

            return res.status(200).json({
                message: 'Update promotion successfully',
                promotion: updated
            });

        } catch (error) {
            console.error('updatePromotion error:', error);
            return res.status(500).json({ message: 'Failed to update promotion', error });
        }
    },


    deletePromotion: async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidId(id)) return res.status(400).json({ message: 'Invalid promotion id' });

            const deleted = await Promotion.findByIdAndDelete(id);
            if (!deleted) return res.status(404).json({ message: 'Promotion not found' });

            return res.status(200).json({ message: 'Delete promotion successfully' });
        } catch (error) {
            console.error('deletePromotion error:', error);
            return res.status(500).json({ message: 'Failed to delete promotion', error });
        }
    },
};

module.exports = promotionController;
