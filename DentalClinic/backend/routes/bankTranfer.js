const express = require('express');
const router = express.Router();
const bankTranferController = require('../controllers/bankTranferController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/bank-transfer/:billId/:promotionId', verifyToken, bankTranferController.getQrCode);
router.get('/bank-transfer/:billId', verifyToken, bankTranferController.getQrCode);
router.post('/verify-webHook', bankTranferController.sepayWebhook);

module.exports = router;