const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/notifications', verifyToken, notificationController.getNotifications);
router.get('/notifications/unread-count', verifyToken, notificationController.getUnreadCount);
router.patch('/notifications/:id/read', verifyToken, notificationController.markAsRead);
router.patch('/notifications/read-all', verifyToken, notificationController.markAllAsRead);
router.delete('/notifications/:id', verifyToken, notificationController.deleteNotification);

module.exports = router;

