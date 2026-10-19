const mongoose = require('mongoose');
const Facility = require('../Models/facility');

const textField = (value) => String(value || '').trim();
const validFacility = (title, description) => title.length > 0 && title.length <= 120 && description.length > 0 && description.length <= 2000;

exports.addFacility = async (req, res) => {
    try {
        const title = textField(req.body?.title);
        const description = textField(req.body?.description);
        if (!validFacility(title, description)) return res.status(400).json({ error: 'Enter a facility name and description (up to 2,000 characters)' });
        const facility = await Facility.create({ title, description, addedBy: req.user._id });
        return res.status(201).json({ message: 'Facility added', facility });
    } catch (error) {
        console.error('Facility creation failed:', error);
        return res.status(500).json({ error: 'Unable to add this facility right now' });
    }
};

exports.updateFacility = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Facility not found' });
        const facility = await Facility.findById(req.params.id);
        if (!facility) return res.status(404).json({ error: 'Facility not found' });
        const title = req.body?.title === undefined ? facility.title : textField(req.body.title);
        const description = req.body?.description === undefined ? facility.description : textField(req.body.description);
        if (!validFacility(title, description)) return res.status(400).json({ error: 'Enter a facility name and description (up to 2,000 characters)' });
        facility.title = title;
        facility.description = description;
        await facility.save();
        return res.status(200).json({ message: 'Facility updated', facility });
    } catch (error) {
        console.error('Facility update failed:', error);
        return res.status(500).json({ error: 'Unable to update this facility right now' });
    }
};

exports.getAllFacility = async (_req, res) => {
    try {
        const facilities = await Facility.find().populate('addedBy', 'name').sort({ title: 1 });
        return res.status(200).json({ facilities });
    } catch (error) {
        console.error('Facility list failed:', error);
        return res.status(500).json({ error: 'Unable to load facilities right now' });
    }
};

exports.deleteFacility = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Facility not found' });
        const facility = await Facility.findByIdAndDelete(req.params.id);
        if (!facility) return res.status(404).json({ error: 'Facility not found' });
        return res.status(200).json({ message: 'Facility removed' });
    } catch (error) {
        console.error('Facility deletion failed:', error);
        return res.status(500).json({ error: 'Unable to remove this facility right now' });
    }
};
