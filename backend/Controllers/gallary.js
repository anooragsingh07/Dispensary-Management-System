const mongoose = require('mongoose');
const GalleryImage = require('../Models/gallary');

const secureImageUrl = (value) => {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'https:' && Boolean(url.hostname);
    } catch {
        return false;
    }
};

exports.addImage = async (req, res) => {
    try {
        const link = String(req.body?.link || '').trim();
        if (link.length > 2048 || !secureImageUrl(link)) return res.status(400).json({ error: 'Use a valid HTTPS image link' });
        const image = await GalleryImage.create({ link, addedBy: req.user._id });
        return res.status(201).json({ message: 'Image added to the gallery', image });
    } catch (error) {
        console.error('Gallery upload record failed:', error);
        return res.status(500).json({ error: 'Unable to add this image right now' });
    }
};

exports.getAllGallary = async (_req, res) => {
    try {
        const images = await GalleryImage.find().sort({ createdAt: -1 });
        return res.status(200).json({ images });
    } catch (error) {
        console.error('Gallery list failed:', error);
        return res.status(500).json({ error: 'Unable to load gallery images right now' });
    }
};

exports.deleteImageById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Gallery image not found' });
        const image = await GalleryImage.findByIdAndDelete(req.params.id);
        if (!image) return res.status(404).json({ error: 'Gallery image not found' });
        return res.status(200).json({ message: 'Gallery image removed' });
    } catch (error) {
        console.error('Gallery image removal failed:', error);
        return res.status(500).json({ error: 'Unable to remove this image right now' });
    }
};
