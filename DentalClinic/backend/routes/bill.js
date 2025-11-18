const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { verifyToken, verifyAdmin, verifyRole } = require('../middlewares/authMiddleware');

router.patch('/pay-bill/:id', verifyToken, verifyRole(['Staff', 'Admin']), billController.payBill);
router.patch('/cancel-bill/:id', verifyToken, verifyRole(['Staff', 'Admin']), billController.cancelBill);
router.get('/get-all-bill', verifyToken, billController.getAllBills);
router.get('/get-bill/:id', verifyToken, billController.getBillById);
router.delete('/delete-bill/:id', verifyToken, verifyAdmin, billController.deleteBill);
router.get('/get-bills-by-customer', verifyToken, verifyRole(['Staff', 'Admin', 'Customer']), billController.getBillsByCustomer);

module.exports = router;