const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { verifyToken, verifyAdmin } = require('../middlewares/authMiddleware');
const { validateCreateService } = require('../middlewares/validateMiddlewares');

router.post("/create-service", verifyAdmin, validateCreateService, serviceController.createService);
router.get("/all-services", verifyToken, serviceController.getAllServices);
router.delete("/delete-service/:id", verifyAdmin, serviceController.deleteService);
router.get("/service/:id", verifyToken, serviceController.getServiceById);
router.put("/update-service/:id", verifyAdmin, serviceController.updateService);
router.get("/booking-services", verifyToken, serviceController.getBookingServices);
router.get("/non-booking-services", verifyToken, serviceController.getNonBookingServices);

module.exports = router;