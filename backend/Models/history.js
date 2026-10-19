const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    roll: { type: String, required: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    medicines: [{
        name: { type: String, required: true, trim: true },
        requiredQuantity: { type: Number, required: true, min: 1 },
    }],
}, { timestamps: true });

historySchema.index({ roll: 1, createdAt: -1 });
module.exports = mongoose.model('history', historySchema);
