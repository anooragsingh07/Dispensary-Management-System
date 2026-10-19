const express = require("express");
const router = express.Router();
const Authentication = require('../Authentication/auth');
const NotificationController = require('../Controllers/notification');

router.post("/add", Authentication.adminAuth, NotificationController.addNotification);
router.get("/get", NotificationController.getNotifications);
router.delete("/delete/:id", Authentication.adminAuth, NotificationController.deleteNotificationById)

module.exports = router;
