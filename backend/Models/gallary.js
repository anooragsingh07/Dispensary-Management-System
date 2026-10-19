const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
    link: { type: String, required: true, trim: true, maxlength: 2048 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
}, { timestamps: true });

module.exports = mongoose.model('gallary', gallerySchema);
