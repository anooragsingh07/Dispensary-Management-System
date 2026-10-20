const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Keep employee patient profiles in the existing student collection so medical
    // records continue to reference one patient ID.
    recordType: { type: String, enum: ['student', 'employee'], default: 'student', required: true },
    roll: { type: String, required: true, trim: true, uppercase: true, maxlength: 50, unique: true },
    employeeId: { type: String, default: '', trim: true, uppercase: true, maxlength: 50 },
    mobileNo: { type: String, default: '', trim: true, maxlength: 24 },
    fatherName: { type: String, default: '', trim: true, maxlength: 120 },
    fatherMobile: { type: String, default: '', trim: true, maxlength: 24 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    previous_health: { type: String, default: '', trim: true, maxlength: 2000 },
    age: { type: Number, min: 1, max: 130 },
    bloodGroup: { type: String, default: '', trim: true, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
}, { timestamps: true, collection: 'students' });

module.exports = mongoose.model('student', studentSchema);
