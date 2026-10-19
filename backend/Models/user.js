const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: { type: String, enum: ['admin', 'staff', 'student'], default: 'student', required: true },
    authVersion: { type: Number, default: 0 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    roll: { type: String, trim: true, sparse: true, unique: true },
    mobileNo: { type: String, default: '', trim: true },
    fatherName: { type: String, default: '', trim: true },
    fatherMobile: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    previous_health: { type: String, default: '', trim: true },
    age: { type: Number, min: 0, max: 130 },
    bloodGroup: { type: String, default: '', trim: true },
    designation: { type: String, default: '', trim: true },
    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    resetPasswordAttempts: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false },
}, { timestamps: true });

module.exports = mongoose.model('user', UserSchema);
