const express = require('express');
const router = express.Router();
const Authentication = require('../Authentication/auth');
const ConsultationController = require('../Controllers/consultation');

router.get('/mine', Authentication.studentAuth, ConsultationController.getMyConsultations);
router.get('/', Authentication.adminFacultyAuth, ConsultationController.getConsultationsByDate);
router.get('/student/:studentId', Authentication.adminFacultyAuth, ConsultationController.getStudentConsultations);
router.post('/', Authentication.adminFacultyAuth, ConsultationController.createConsultation);
router.put('/:id', Authentication.adminFacultyAuth, ConsultationController.updateConsultation);

module.exports = router;
