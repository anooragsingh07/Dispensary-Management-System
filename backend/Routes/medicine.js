const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const MedicineController = require('../Controllers/medicine')

router.post('/add', Authentication.adminStaffAuth, MedicineController.addMedicine)
router.get('/get', MedicineController.getMedicine);
router.get('/search', MedicineController.searchMedicine);
router.put('/update/:id', Authentication.adminStaffAuth, MedicineController.updateMedicineById)
router.delete('/delete/:id', Authentication.adminStaffAuth, MedicineController.deleteMedicineById)

module.exports = router;
