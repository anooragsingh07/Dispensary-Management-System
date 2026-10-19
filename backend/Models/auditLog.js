const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    action: { type: String, enum: ['consultation.created', 'consultation.updated'], required: true },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'consultation', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'student', required: true, index: true },
    // Record field names only; clinical values are kept out of the audit stream.
    changedFields: [{ type: String, trim: true, maxlength: 80 }],
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' });

auditLogSchema.index({ consultationId: 1, createdAt: -1 });
module.exports = mongoose.model('auditLog', auditLogSchema);
