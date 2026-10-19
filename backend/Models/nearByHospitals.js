const mongoose = require('mongoose');

const nearBySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 160 },
    address: { type: String, required: true, trim: true, maxlength: 500 },
    contact: { type: String, required: true, trim: true, maxlength: 80 },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
}, { timestamps: true });

module.exports = mongoose.model('nearByHospital', nearBySchema);
