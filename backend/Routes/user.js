const express = require('express');
const router = express.Router();
const UserController = require('../Controllers/user');
const Authentication = require('../Authentication/auth');

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/me', Authentication.authenticate, UserController.getCurrentUser);
router.post('/change-password', Authentication.authenticate, UserController.changePassword);
router.post('/logout', Authentication.authenticate, UserController.logout);

router.get('/get-staffs', UserController.getAllStaffs);
router.get('/get-staffs/manage', Authentication.adminAuth, UserController.getStaffsForManagement);
router.post('/add-staff', Authentication.adminAuth, UserController.addStaffsByAdmin);
router.put('/update-staff/:id', Authentication.adminAuth, UserController.updateStaffById);
router.delete('/delete-staff/:id', Authentication.adminAuth, UserController.deleteStaff);

router.post('/register-student', Authentication.adminFacultyAuth, UserController.registerStudentByStaff);
router.post('/issue-student-password/:id', Authentication.adminFacultyAuth, UserController.issueStudentTemporaryPassword);
router.put('/update-student/:id', Authentication.adminFacultyAuth, UserController.updateStudentById);
router.get('/get-student/:roll', Authentication.adminFacultyAuth, UserController.getStudentByRollNo);

module.exports = router;
