const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'consultation', required: true, index: true },
    medicineId: { type: mongoose.Schema.Types.ObjectId, ref: 'medicine', default: null },
    medicineName: { type: String, required: true, trim: true, maxlength: 160 },
    dosage: { type: String, trim: true, maxlength: 200, default: '' },
    frequency: { type: String, trim: true, maxlength: 120, default: '' },
    duration: { type: String, trim: true, maxlength: 120, default: '' },
    dispensedQuantity: { type: Number, min: 0, default: 0 },
    legacyHistoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'history' },
    legacyItemIndex: { type: Number, min: 0 },
}, { timestamps: true, collection: 'prescriptions' });

prescriptionSchema.index({ consultationId: 1, createdAt: 1 });
prescriptionSchema.index({ legacyHistoryId: 1, legacyItemIndex: 1 }, { unique: true, sparse: true });
module.exports = mongoose.model('prescription', prescriptionSchema);
