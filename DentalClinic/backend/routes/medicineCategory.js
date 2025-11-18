const express = require('express');
const router = express.Router();
const medicineCategoryController = require('../controllers/medicineCategoryController');
const { verifyAdmin } = require('../middlewares/authMiddleware');

router.post("/create-medicine-category", verifyAdmin, medicineCategoryController.createMedicineCategory);
router.get("/get-medicine-categories", medicineCategoryController.getAllMedicineCategories);
router.get("/get-medicine-category/:id", medicineCategoryController.getMedicineCategoryById);
router.put("/update-medicine-category/:id", verifyAdmin, medicineCategoryController.updateMedicineCategory);
router.delete("/delete-medicine-category/:id", verifyAdmin, medicineCategoryController.deleteMedicineCategory);

module.exports = router;