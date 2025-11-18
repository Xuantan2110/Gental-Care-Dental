const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin } = require('../middlewares/validateMiddlewares');
const { verifyToken } = require('../middlewares/authMiddleware');

router.post('/login',validateLogin, authController.login);
router.post('/change-password-first-login',verifyToken,  authController.changePasswordFirstLogin);
router.post('/change-password',verifyToken, authController.changePassword);
router.post('/request-otp', authController.requestOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

module.exports = router;