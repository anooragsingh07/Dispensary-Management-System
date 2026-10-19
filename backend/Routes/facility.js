const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const FacilityController = require('../Controllers/facility');

router.post('/add', Authentication.adminStaffAuth, FacilityController.addFacility)
router.get('/get', FacilityController.getAllFacility)
router.put('/update/:id', Authentication.adminStaffAuth, FacilityController.updateFacility)
router.delete('/delete/:id', Authentication.adminStaffAuth, FacilityController.deleteFacility)

module.exports = router;
