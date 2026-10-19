const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const GallaryController = require('../Controllers/gallary');

router.post('/add', Authentication.adminStaffAuth, GallaryController.addImage)
router.get('/get', GallaryController.getAllGallary)
router.delete('/delete/:id', Authentication.adminStaffAuth, GallaryController.deleteImageById)

module.exports = router;
