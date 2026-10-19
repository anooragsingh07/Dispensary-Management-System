const mongoose = require('mongoose');
const Notification = require('../Models/notification');

exports.addNotification = async (req, res) => {
    try {
        const title = String(req.body?.title || '').trim();
        if (!title || title.length > 400) return res.status(400).json({ error: 'Enter a notice of up to 400 characters' });
        const notification = await Notification.create({ title, addedBy: req.user._id });
        return res.status(201).json({ message: 'Notice published', notification });
    } catch (error) {
        console.error('Notice creation failed:', error);
        return res.status(500).json({ error: 'Unable to publish this notice right now' });
    }
};

exports.getNotifications = async (_req, res) => {
    try {
        const notifications = await Notification.find().sort({ createdAt: -1 }).limit(50);
        return res.status(200).json({ notifications });
    } catch (error) {
        console.error('Notice list failed:', error);
        return res.status(500).json({ error: 'Unable to load notices right now' });
    }
};

exports.deleteNotificationById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Notice not found' });
        const notification = await Notification.findByIdAndDelete(req.params.id);
        if (!notification) return res.status(404).json({ error: 'Notice not found' });
        return res.status(200).json({ message: 'Notice removed' });
    } catch (error) {
        console.error('Notice removal failed:', error);
        return res.status(500).json({ error: 'Unable to remove this notice right now' });
    }
};
