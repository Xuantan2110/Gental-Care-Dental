const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.post('/create-appointment', verifyToken, verifyRole(['Customer', 'Staff']), appointmentController.createAppointment);
router.post('/staff-create-appointment', verifyToken, verifyRole(['Staff']), appointmentController.staffCreateAppointment);
router.get('/get-all-appointments', verifyToken, verifyRole(['Admin', 'Staff']), appointmentController.getAllAppointments);
router.delete('/delete-appointment/:id', verifyToken, verifyRole(['Admin']), appointmentController.deleteAppointment);
router.patch('/confirm-appointment/:id', verifyToken, verifyRole(['Staff', 'Admin']), appointmentController.confirmAppointment);
router.patch('/reject-appointment/:id', verifyToken, verifyRole(['Staff', 'Admin']), appointmentController.rejectAppointment);
router.get('/get-appointment/:id', verifyToken, verifyRole(['Admin', 'Staff', 'Dentist']), appointmentController.getAppointmentById);
router.get('/get-appointments-by-dentist', verifyToken, verifyRole(['Admin', 'Staff', 'Dentist']), appointmentController.getAppointmentsByDentist);
router.get('/get-appointments-by-customer', verifyToken, verifyRole(['Admin', 'Staff', 'Customer']), appointmentController.getAppointmentsByCustomer)

module.exports = router;