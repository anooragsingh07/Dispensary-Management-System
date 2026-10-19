const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    roll: { type: String, required: true, trim: true, uppercase: true, maxlength: 50, unique: true },
    mobileNo: { type: String, default: '', trim: true, maxlength: 24 },
    fatherName: { type: String, default: '', trim: true, maxlength: 120 },
    fatherMobile: { type: String, default: '', trim: true, maxlength: 24 },
    address: { type: String, default: '', trim: true, maxlength: 500 },
    previous_health: { type: String, default: '', trim: true, maxlength: 2000 },
    age: { type: Number, min: 1, max: 130 },
    bloodGroup: { type: String, default: '', trim: true, enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    deletedAt: { type: Date, default: null },
}, { timestamps: true, collection: 'students' });

module.exports = mongoose.model('student', studentSchema);
