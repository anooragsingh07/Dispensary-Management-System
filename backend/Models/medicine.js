const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 160 },
    quantity: { type: Number, required: true, min: 0, validate: Number.isFinite },
    usage: { type: String, required: true, trim: true, maxlength: 1000 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
}, { timestamps: true });

MedicineSchema.index({ name: 1 });

module.exports = mongoose.model('medicine', MedicineSchema);
