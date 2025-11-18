const express = require("express");
const router = express.Router();
const conversationController = require("../controllers/conversationController");
const { verifyToken, verifyRole, verifyAdmin } = require('../middlewares/authMiddleware');

router.get("/my-conversation", verifyToken, verifyRole([ 'Staff', 'Customer' ]), conversationController.getCustomerConversation);
router.get("/all-conversation", verifyToken, verifyRole([ 'Staff' ]), conversationController.getAllConversationsForStaff);
router.delete("/delete-conversation/:conversationId", verifyAdmin, conversationController.deleteConversation);

module.exports = router;