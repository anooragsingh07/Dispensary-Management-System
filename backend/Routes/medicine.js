const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const MedicineController = require('../Controllers/medicine')

router.post('/add', Authentication.adminFacultyAuth, MedicineController.addMedicine)
router.get('/get', MedicineController.getMedicine);
router.get('/search', MedicineController.searchMedicine);
router.put('/update/:id', Authentication.adminFacultyAuth, MedicineController.updateMedicineById)
router.delete('/delete/:id', Authentication.adminFacultyAuth, MedicineController.deleteMedicineById)

module.exports = router;
