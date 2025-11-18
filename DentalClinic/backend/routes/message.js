const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.post("/send-message", verifyToken, verifyRole(['Customer', 'Staff']), messageController.sendMessage);
router.get("/conversation/:id", verifyToken, verifyRole(['Customer', 'Staff']), messageController.getMessagesByConversation);
router.put("/mark-read/:conversationId", verifyToken, messageController.markMessagesAsRead);

module.exports = router;
