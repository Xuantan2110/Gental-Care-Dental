const express = require('express');
const router = express.Router();
const dentistWorkingTimeController = require('../controllers/dentistWorkingTimeController');
const { verifyToken, verifyRole, verifyAdmin } = require('../middlewares/authMiddleware');

router.post('/create-dentist-working-time', verifyAdmin, dentistWorkingTimeController.createDentistWorkingTime);
router.get('/get-all-dentist-working-time', verifyToken, verifyRole([ 'Staff', 'Admin' ]), dentistWorkingTimeController.getAllDentistWorkingTime);
router.get('/get-dentist-working-time/:id', verifyToken, verifyRole([ 'Staff', 'Admin' ]), dentistWorkingTimeController.getDentistWorkingTimeById);
router.put('/update-dentist-working-time/:id', verifyAdmin, dentistWorkingTimeController.updateDentistWorkingTime);
router.delete('/delete-dentist-working-time/:id', verifyAdmin, dentistWorkingTimeController.deleteDentistWorkingTime);
router.get('/get-dentist-days-off/:dentistId', verifyToken, dentistWorkingTimeController.getDentistDaysOff);
router.post('/get-dentist-free-time-ranges/:dentistId', verifyToken, dentistWorkingTimeController.getDentistFreeTimeRanges);

module.exports = router;