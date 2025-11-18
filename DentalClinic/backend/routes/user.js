const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { upload, handleMulterError } = require("../middlewares/upload");
const { validateRegister, validateCreateUser, validateUpdateProfile } = require('../middlewares/validateMiddlewares');
const { verifyToken, verifyAdmin, verifyRole } = require('../middlewares/authMiddleware');

router.post('/register', validateRegister, userController.register);
router.post('/create-user', verifyToken, verifyAdmin, validateCreateUser, userController.createUser);
router.get('/all-users', verifyToken, verifyRole(['Admin', 'Staff', 'Dentist']), userController.getAllUsers);
router.delete('/delete-user/:id', verifyAdmin, userController.deleteUser);
router.patch('/toggle-status/:id', verifyAdmin, userController.toggleStatus);
router.get('/get-user/:id', verifyToken, verifyRole(['Admin', 'Staff', 'Dentist']), userController.getUserById);
router.get('/profile', verifyToken, userController.getProfile);
router.patch('/update-profile', verifyToken, validateUpdateProfile, userController.updateProfile);
router.patch('/update-photo', verifyToken, upload.single("avatar"), handleMulterError, userController.updatePhoto);
router.get('/get-all-dentist', verifyToken, verifyRole(['Admin', 'Staff', 'Customer']), userController.getAllDentists);
router.get('/get-all-customer', verifyToken, verifyRole(['Admin', 'Dentist', 'Staff']), userController.getAllCustomers);

module.exports = router;