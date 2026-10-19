const Medicine = require('../Models/medicine');

const cleanName = (value) => String(value || '').trim();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const validQuantity = (value) => value !== '' && value !== null && value !== undefined && Number.isSafeInteger(Number(value)) && Number(value) >= 0;

exports.addMedicine = async (req, res) => {
    try {
        const body = req.body || {};
        const name = cleanName(body.name);
        const usage = cleanName(body.usage);
        if (!name || name.length > 160 || !usage || usage.length > 1000 || !validQuantity(body.quantity)) {
            return res.status(400).json({ error: 'Enter a name, a whole-number quantity of zero or more, and usage instructions' });
        }
        const medicine = await Medicine.create({ name, quantity: Number(body.quantity), usage, addedBy: req.user._id });
        return res.status(201).json({ message: 'Medicine added to stock', medicine });
    } catch (error) {
        console.error('Medicine creation failed:', error);
        return res.status(500).json({ error: 'Unable to add this medicine right now' });
    }
};

const getMedicineList = async (query) => Medicine.find(query)
    .populate('addedBy', 'name')
    .sort({ name: 1 });

exports.getMedicine = async (_req, res) => {
    try {
        return res.status(200).json({ medicines: await getMedicineList({}) });
    } catch (error) {
        console.error('Medicine list failed:', error);
        return res.status(500).json({ error: 'Unable to load medicine stock right now' });
    }
};

exports.searchMedicine = async (req, res) => {
    try {
        const name = cleanName(req.query.name);
        const query = name ? { name: { $regex: escapeRegex(name), $options: 'i' } } : {};
        return res.status(200).json({ medicines: await getMedicineList(query) });
    } catch (error) {
        console.error('Medicine search failed:', error);
        return res.status(500).json({ error: 'Unable to search medicine stock right now' });
    }
};

exports.updateMedicineById = async (req, res) => {
    try {
        const body = req.body || {};
        const updates = {};
        if (body.name !== undefined) {
            updates.name = cleanName(body.name);
            if (!updates.name || updates.name.length > 160) return res.status(400).json({ error: 'Medicine name is required and must be under 160 characters' });
        }
        if (body.usage !== undefined) {
            updates.usage = cleanName(body.usage);
            if (!updates.usage || updates.usage.length > 1000) return res.status(400).json({ error: 'Usage instructions are required and must be under 1,000 characters' });
        }
        if (body.quantity !== undefined) {
            if (!validQuantity(body.quantity)) return res.status(400).json({ error: 'Quantity must be a whole number of zero or more' });
            updates.quantity = Number(body.quantity);
        }
        if (!Object.keys(updates).length) return res.status(400).json({ error: 'Provide at least one field to update' });

        const medicine = await Medicine.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true });
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
        return res.status(200).json({ message: 'Medicine details updated', medicine });
    } catch (error) {
        console.error('Medicine update failed:', error);
        return res.status(500).json({ error: 'Unable to update this medicine right now' });
    }
};

exports.deleteMedicineById = async (req, res) => {
    try {
        const medicine = await Medicine.findByIdAndDelete(req.params.id);
        if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
        return res.status(200).json({ message: 'Medicine removed from stock' });
    } catch (error) {
        console.error('Medicine deletion failed:', error);
        return res.status(500).json({ error: 'Unable to remove this medicine right now' });
    }
};
