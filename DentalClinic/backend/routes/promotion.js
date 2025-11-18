const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { verifyToken, verifyAdmin, verifyRole } = require('../middlewares/authMiddleware');

router.post('/create-promotion', verifyToken, verifyAdmin, promotionController.createPromotion);
router.get('/get-all-promotion', verifyToken, verifyRole(['Staff', 'Admin']), promotionController.getAllPromotion);
router.get('/get-ongoing-promotion', verifyToken, verifyRole(['Staff', 'Admin']), promotionController.getOngoingPromotions);
router.get('/get-promotion/:id', verifyToken, verifyRole(['Staff', 'Admin']), promotionController.getPromotionById);
router.put('/update-promotion/:id', verifyToken, verifyAdmin, promotionController.updatePromotion);
router.delete('/delete-promotion/:id', verifyToken, verifyAdmin, promotionController.deletePromotion);

module.exports = router;