const mongoose = require('mongoose');
const Hospital = require('../Models/nearByHospitals');

const clean = (value) => String(value || '').trim();
const validHospital = (name, address, contact) => name.length > 0 && name.length <= 160 && address.length > 0 && address.length <= 500 && contact.length > 0 && contact.length <= 80;

exports.addNearByHospital = async (req, res) => {
    try {
        const name = clean(req.body?.name);
        const address = clean(req.body?.address);
        const contact = clean(req.body?.contact);
        if (!validHospital(name, address, contact)) return res.status(400).json({ error: 'Enter a hospital name, address and contact number' });
        const hospital = await Hospital.create({ name, address, contact, addedBy: req.user._id });
        return res.status(201).json({ message: 'Hospital added', hospital });
    } catch (error) {
        console.error('Hospital creation failed:', error);
        return res.status(500).json({ error: 'Unable to add this hospital right now' });
    }
};

exports.getHospitals = async (_req, res) => {
    try {
        const hospitals = await Hospital.find().populate('addedBy', 'name').sort({ name: 1 });
        return res.status(200).json({ hospitals });
    } catch (error) {
        console.error('Hospital list failed:', error);
        return res.status(500).json({ error: 'Unable to load nearby hospitals right now' });
    }
};

exports.updateHospitalById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Hospital not found' });
        const hospital = await Hospital.findById(req.params.id);
        if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
        const name = req.body?.name === undefined ? hospital.name : clean(req.body.name);
        const address = req.body?.address === undefined ? hospital.address : clean(req.body.address);
        const contact = req.body?.contact === undefined ? hospital.contact : clean(req.body.contact);
        if (!validHospital(name, address, contact)) return res.status(400).json({ error: 'Enter a hospital name, address and contact number' });
        hospital.name = name;
        hospital.address = address;
        hospital.contact = contact;
        await hospital.save();
        return res.status(200).json({ message: 'Hospital details updated', hospital });
    } catch (error) {
        console.error('Hospital update failed:', error);
        return res.status(500).json({ error: 'Unable to update this hospital right now' });
    }
};

exports.deleteHospitalById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Hospital not found' });
        const hospital = await Hospital.findByIdAndDelete(req.params.id);
        if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
        return res.status(200).json({ message: 'Hospital removed' });
    } catch (error) {
        console.error('Hospital deletion failed:', error);
        return res.status(500).json({ error: 'Unable to remove this hospital right now' });
    }
};
