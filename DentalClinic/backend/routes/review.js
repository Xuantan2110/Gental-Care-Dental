const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyToken, verifyAdmin, verifyRole } = require('../middlewares/authMiddleware');

router.post('/create-review', verifyToken, verifyRole(['Customer']), reviewController.createReview);
router.get('/get-review/:reviewId', verifyAdmin, reviewController.getReviewById);
router.get('/get-all-reviews', verifyAdmin, reviewController.getAllReviews);
router.put('/update-review/:reviewId', verifyAdmin, reviewController.updateReviewById);
router.delete('/delete-review/:reviewId', verifyAdmin, reviewController.deleteReviewById);
router.get('/get-highlight-reviews', verifyToken, reviewController.getHighlightedReviews);

module.exports = router;