const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'student', required: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', default: null },
    visitAt: { type: Date, required: true, default: Date.now },
    chiefComplaint: { type: String, trim: true, maxlength: 500, default: '' },
    symptoms: { type: String, trim: true, maxlength: 2000, default: '' },
    vitals: {
        temperatureC: { type: Number, min: 20, max: 50 },
        bloodPressure: { type: String, trim: true, maxlength: 24, default: '' },
        pulseBpm: { type: Number, min: 1, max: 300 },
        other: { type: String, trim: true, maxlength: 1000, default: '' },
    },
    diagnosis: { type: String, trim: true, maxlength: 2000, default: '' },
    doctorAdvice: { type: String, trim: true, maxlength: 2000, default: '' },
    precautions: { type: String, trim: true, maxlength: 2000, default: '' },
    followUpAt: { type: Date, default: null },
    // Hidden by default. Student-facing APIs never select or serialize this field.
    clinicalNotes: { type: String, trim: true, maxlength: 4000, default: '', select: false },
    legacyHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'history', unique: true, sparse: true },
}, { timestamps: true, collection: 'consultations' });

consultationSchema.index({ studentId: 1, visitAt: -1 });
consultationSchema.index({ doctorId: 1, visitAt: -1 });
module.exports = mongoose.model('consultation', consultationSchema);
