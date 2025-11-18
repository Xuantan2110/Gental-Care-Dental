const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

router.post("/create-medicine", verifyAdmin, medicineController.createMedicine);
router.get("/get-medicines", medicineController.getAllMedicines);
router.get("/get-medicine/:id", medicineController.getMedicineById);
router.put("/update-medicine/:id", verifyAdmin, medicineController.updateMedicine);
router.delete("/delete-medicine/:id", verifyAdmin, medicineController.deleteMedicine);

module.exports = router;