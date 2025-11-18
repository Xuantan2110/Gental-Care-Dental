const express = require('express');
const router = express.Router();
const dentistProfileController = require('../controllers/dentistProfileController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.post("/create-dentist-profile", verifyToken, verifyRole(['Admin']), dentistProfileController.createDentistProfile);
router.get("/get-dentist-profile/:dentistId", verifyToken, verifyRole(['Admin']), dentistProfileController.getdentistProfileById);
router.get("/get-all-dentist-profile", verifyToken, dentistProfileController.getAllDentistProfiles);
router.put("/update-dentist-profile/:dentistId", verifyToken, verifyRole(['Admin']), dentistProfileController.updateDentistProfileByDentistId);
router.delete("/delete-dentist-profile/:dentistId", verifyToken, verifyRole(['Admin']), dentistProfileController.deleteDentistProfileByDentistId);

module.exports = router;