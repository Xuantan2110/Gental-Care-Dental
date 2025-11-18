const express = require('express');
const router = express.Router();
const medicalRecordController = require('../controllers/medicalRecordController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.post('/create-medical-record', verifyToken, verifyRole(['Dentist', 'Admin']), medicalRecordController.createMedicalRecord);
router.get('/get-basic-medical-records', verifyToken, verifyRole(['Dentist', 'Admin']), medicalRecordController.getBasicMedicalRecords);
router.get('/get-medical-record-detail/:id', verifyToken, medicalRecordController.getMedicalRecordDetail);
router.delete('/delete-medical-record/:id', verifyToken, verifyRole(['Admin']), medicalRecordController.deleteMedicalRecord);
router.patch('/update-medical-info/:id', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.updateMedicalInfo);
router.post('/add-service-used/:id', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.addServiceToMedicalRecord);
router.delete('/delete-service-used/:recordId/:serviceItemId', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.removeServiceFromMedicalRecord);
router.post('/add-prescriptions/:id', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.addPrescriptionToMedicalRecord);
router.delete('/delete-prescriptions-item/:recordId/:prescriptionItemId', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.removePrescriptionFromMedicalRecord);
router.patch('/finish-treatment/:id', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.finishMedicalRecord);
router.patch('/cancel-treatment/:id', verifyToken, verifyRole(['Admin', 'Dentist']), medicalRecordController.cancelMedicalRecord);
router.get('/get-medical-record-by-customer', verifyToken, verifyRole(['Customer', 'Admin', 'Staff']), medicalRecordController.getMedicalRecordByCustomer);

module.exports = router;