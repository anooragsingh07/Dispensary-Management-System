const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const FacilityController = require('../Controllers/facility');

router.post('/add', Authentication.adminFacultyAuth, FacilityController.addFacility)
router.get('/get', FacilityController.getAllFacility)
router.put('/update/:id', Authentication.adminFacultyAuth, FacilityController.updateFacility)
router.delete('/delete/:id', Authentication.adminFacultyAuth, FacilityController.deleteFacility)

module.exports = router;
