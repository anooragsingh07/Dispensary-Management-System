const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    action: { type: String, enum: ['consultation.created', 'consultation.updated', 'student.deleted'], required: true },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'consultation', default: null, required: function () { return this.action !== 'student.deleted'; }, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'student', required: true, index: true },
    // Record field names only; clinical values are kept out of the audit stream.
    changedFields: [{ type: String, trim: true, maxlength: 80 }],
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'audit_logs' });

auditLogSchema.index({ consultationId: 1, createdAt: -1 });
module.exports = mongoose.model('auditLog', auditLogSchema);
