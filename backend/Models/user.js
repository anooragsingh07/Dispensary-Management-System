const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Student profile data lives in students; staff/admin display names live here.
    name: { type: String, trim: true, maxlength: 120 },
    role: { type: String, enum: ['admin', 'doctor', 'staff', 'student'], default: 'student', required: true },
    authVersion: { type: Number, default: 0 },
    // Email is the authentication identifier. Student profile data is linked by studentId.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    password: { type: String, required: true, select: false },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'student' },
    designation: { type: String, default: '', trim: true, maxlength: 120 },
    mobileNo: { type: String, default: '', trim: true, maxlength: 24 },
}, { timestamps: true, collection: 'users' });

userSchema.index({ studentId: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('user', userSchema);
