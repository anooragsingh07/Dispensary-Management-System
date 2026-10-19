const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const HospitalController = require('../Controllers/nearByHospital');

router.post("/add", Authentication.adminStaffAuth, HospitalController.addNearByHospital)
router.get("/get", HospitalController.getHospitals);
router.put("/update/:id", Authentication.adminStaffAuth, HospitalController.updateHospitalById)
router.delete("/delete/:id", Authentication.adminStaffAuth, HospitalController.deleteHospitalById)

module.exports = router;
