const Notification = require('../models/Notification');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Bill = require('../models/Bill');
const mongoose = require('mongoose');
const { getIo } = require('../config/socket');

const notificationController = {
    getNotifications: async (req, res) => {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;

            const skip = (parseInt(page) - 1) * parseInt(limit);

            const notifications = await Notification.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean();

            const total = await Notification.countDocuments({ userId });
            const unreadCount = await Notification.countDocuments({ userId, isRead: false });

            return res.status(200).json({
                message: 'Get notifications successfully',
                notifications,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    totalPages: Math.ceil(total / parseInt(limit))
                },
                unreadCount
            });
        } catch (error) {
            console.error('Error getting notifications:', error);
            return res.status(500).json({
                message: 'An error occurred while getting notifications',
                error: error.message
            });
        }
    },

    getUnreadCount: async (req, res) => {
        try {
            const userId = req.user.id;
            const count = await Notification.countDocuments({ userId, isRead: false });

            return res.status(200).json({
                message: 'Get unread count successfully',
                unreadCount: count
            });
        } catch (error) {
            console.error('Error getting unread count:', error);
            return res.status(500).json({
                message: 'An error occurred while getting unread count',
                error: error.message
            });
        }
    },

    markAsRead: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid notification id' });
            }

            const notification = await Notification.findOne({ _id: id, userId });
            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }

            notification.isRead = true;
            await notification.save();

            return res.status(200).json({
                message: 'Notification marked as read',
                notification
            });
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return res.status(500).json({
                message: 'An error occurred while marking notification as read',
                error: error.message
            });
        }
    },

    markAllAsRead: async (req, res) => {
        try {
            const userId = req.user.id;

            await Notification.updateMany(
                { userId, isRead: false },
                { $set: { isRead: true } }
            );

            return res.status(200).json({
                message: 'All notifications marked as read'
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            return res.status(500).json({
                message: 'An error occurred while marking all notifications as read',
                error: error.message
            });
        }
    },

    // Delete notification
    deleteNotification: async (req, res) => {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ message: 'Invalid notification id' });
            }

            const notification = await Notification.findOneAndDelete({ _id: id, userId });
            if (!notification) {
                return res.status(404).json({ message: 'Notification not found' });
            }

            return res.status(200).json({
                message: 'Notification deleted successfully'
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            return res.status(500).json({
                message: 'An error occurred while deleting notification',
                error: error.message
            });
        }
    }
};

async function createAndEmitNotification(userId, type, title, message, relatedId) {
    try {
        const notification = new Notification({
            userId,
            type,
            title,
            message,
            relatedId
        });

        await notification.save();

        const io = getIo();
        if (io) {
            io.to(`user:${userId}`).emit('newNotification', {
                notification: {
                    _id: notification._id,
                    userId: notification.userId,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    relatedId: notification.relatedId,
                    isRead: notification.isRead,
                    createdAt: notification.createdAt
                }
            });
        }

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        return null;
    }
}

async function notifyNewAppointment(appointment) {
    try {
        const staffUsers = await User.find({ role: 'Staff', isActive: true }).select('_id');
        
        const customerId = appointment.customerId?._id || appointment.customerId;
        const dentistId = appointment.dentistId?._id || appointment.dentistId;
        const customer = await User.findById(customerId).select('fullName');
        const dentist = await User.findById(dentistId).select('fullName');
        const dateStr = new Date(appointment.date).toLocaleDateString('vi-VN');
        const timeStr = new Date(appointment.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        const title = 'New appointment';
        const message = `Customer ${customer?.fullName || 'N/A'} has booked an appointment with dentist ${dentist?.fullName || 'N/A'} on ${dateStr} at ${timeStr}`;

        for (const staff of staffUsers) {
            await createAndEmitNotification(
                staff._id,
                'new_appointment',
                title,
                message,
                appointment._id
            );
        }
    } catch (error) {
        console.error('Error notifying new appointment:', error);
    }
}

// Create notification for appointment confirmed/rejected (notify dentist)
async function notifyAppointmentDecision(appointment, decision) {
    try {
        const dentistId = appointment.dentistId?._id || appointment.dentistId;
        if (!dentistId) return;

        const customerId = appointment.customerId?._id || appointment.customerId;
        const customer = await User.findById(customerId).select('fullName');
        const dateStr = new Date(appointment.date).toLocaleDateString('vi-VN');
        const timeStr = new Date(appointment.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        let title, message;
        if (decision === 'confirmed') {
            title = 'Appointment confirmed';
            message = `Appointment with customer ${customer?.fullName || 'N/A'} on ${dateStr} at ${timeStr} has been confirmed by staff`;
        } else {
            title = 'Appointment rejected';
            const rejectReason = appointment.decision?.rejectReason || 'No reason';
            message = `Appointment with customer ${customer?.fullName || 'N/A'} on ${dateStr} at ${timeStr} has been rejected by staff. Reason: ${rejectReason}`;
        }

        await createAndEmitNotification(
            dentistId,
            decision === 'confirmed' ? 'appointment_confirmed' : 'appointment_rejected',
            title,
            message,
            appointment._id
        );
    } catch (error) {
        console.error('Error notifying appointment decision:', error);
    }
}

// Create notification for new bill (notify all staff)
async function notifyNewBill(bill) {
    try {
        const staffUsers = await User.find({ role: 'Staff', isActive: true }).select('_id');
        
        const customerId = bill.customerId?._id || bill.customerId;
        const dentistId = bill.dentistId?._id || bill.dentistId;
        const customer = await User.findById(customerId).select('fullName');
        const dentist = await User.findById(dentistId).select('fullName');
        const finalAmount = typeof bill.finalAmount === 'object' && bill.finalAmount.$numberDecimal 
            ? Number(bill.finalAmount.$numberDecimal) 
            : Number(bill.finalAmount || 0);

        const title = 'New bill';
        const message = `Dentist ${dentist?.fullName || 'N/A'} has completed the examination and created a bill for customer ${customer?.fullName || 'N/A'} with total amount ${finalAmount.toLocaleString('vi-VN')} VNĐ`;

        for (const staff of staffUsers) {
            await createAndEmitNotification(
                staff._id,
                'new_bill',
                title,
                message,
                bill._id
            );
        }
    } catch (error) {
        console.error('Error notifying new bill:', error);
    }
}

module.exports = notificationController;
module.exports.notifyNewAppointment = notifyNewAppointment;
module.exports.notifyAppointmentDecision = notifyAppointmentDecision;
module.exports.notifyNewBill = notifyNewBill;

