const mongoose = require('mongoose');
const History = require('../Models/history');
const Medicine = require('../Models/medicine');
const User = require('../Models/user');

const numericQuantity = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 1000000;
const quantityInStock = { $convert: { input: '$quantity', to: 'double', onError: 0, onNull: 0 } };

const restoreReservations = async (reserved) => {
    const results = await Promise.allSettled(reserved.map(({ medicineId, quantity }) => Medicine.updateOne(
        { _id: medicineId },
        [{ $set: { quantity: { $add: [
            { $convert: { input: '$quantity', to: 'double', onError: 0, onNull: 0 } },
            quantity,
        ] } } }],
    )));
    for (const result of results) {
        if (result.status === 'rejected') console.error('Could not fully restore medicine stock after a failed visit record:', result.reason);
    }
};

exports.addHistory = async (req, res) => {
    const reserved = [];
    try {
        const body = req.body || {};
        if (!body.student || !mongoose.isValidObjectId(body.student) || !Array.isArray(body.medicines) || body.medicines.length === 0 || body.medicines.length > 30) {
            return res.status(400).json({ error: 'Choose a student and at least one medicine' });
        }

        const student = await User.findOne({ _id: body.student, role: 'student' }).select('_id roll');
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const requested = new Map();
        for (const item of body.medicines) {
            if (!item?._id || !mongoose.isValidObjectId(item._id) || !numericQuantity(item.requiredQuantity)) {
                return res.status(400).json({ error: 'Each medicine needs a valid whole-number quantity greater than zero' });
            }
            const id = String(item._id);
            const quantity = (requested.get(id) || 0) + Number(item.requiredQuantity);
            if (!Number.isSafeInteger(quantity) || quantity > 1000000) return res.status(400).json({ error: 'Requested medicine quantity is too large' });
            requested.set(id, quantity);
        }

        const dispensedMedicines = [];
        for (const [medicineId, quantity] of requested) {
            const medicine = await Medicine.findOneAndUpdate(
                { _id: medicineId, $expr: { $gte: [quantityInStock, quantity] } },
                [{ $set: { quantity: { $subtract: [quantityInStock, quantity] } } }],
                { new: true, projection: { name: 1, quantity: 1 } },
            ).lean();

            if (!medicine) {
                await restoreReservations(reserved);
                const existingMedicine = await Medicine.findById(medicineId).select('name');
                const message = existingMedicine ? `There is not enough stock for ${existingMedicine.name}` : 'One of the selected medicines is no longer in stock';
                return res.status(409).json({ error: message });
            }

            reserved.push({ medicineId, quantity });
            dispensedMedicines.push({ name: medicine.name, requiredQuantity: quantity });
        }

        const history = await History.create({
            roll: student.roll,
            student: student._id,
            medicines: dispensedMedicines,
        });
        return res.status(201).json({ message: 'Visit record saved and medicine stock updated', history });
    } catch (error) {
        await restoreReservations(reserved);
        console.error('Visit record creation failed:', error);
        return res.status(500).json({ error: 'Unable to save this visit record right now. Any reserved stock has been restored where possible.' });
    }
};

exports.getHistoryByDate = async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        if (month || year) {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const monthIndex = months.indexOf(String(month || ''));
            const yearNumber = Number(year);
            if (monthIndex < 0 || !Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > new Date().getFullYear() + 1) {
                return res.status(400).json({ error: 'Select a valid month and year' });
            }
            query.createdAt = { $gte: new Date(yearNumber, monthIndex, 1), $lt: new Date(yearNumber, monthIndex + 1, 1) };
        }

        const history = await History.find(query).populate('student', 'name roll').sort({ createdAt: -1 });
        return res.status(200).json({ history });
    } catch (error) {
        console.error('Visit records list failed:', error);
        return res.status(500).json({ error: 'Unable to load visit records right now' });
    }
};

exports.getStudentHistoryByRoll = async (req, res) => {
    try {
        const roll = String(req.params.roll || '').trim();
        if (!roll) return res.status(400).json({ error: 'Enter a student roll number' });
        const student = await User.findOne({ roll, role: 'student' }).select('_id');
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const history = await History.find({ student: student._id }).populate('student', 'name roll').sort({ createdAt: -1 });
        return res.status(200).json({ history });
    } catch (error) {
        console.error('Student visit history lookup failed:', error);
        return res.status(500).json({ error: 'Unable to load this student’s records right now' });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const history = await History.find({ student: req.user._id }).populate('student', 'name roll').sort({ createdAt: -1 });
        return res.status(200).json({ history });
    } catch (error) {
        console.error('Student visit history failed:', error);
        return res.status(500).json({ error: 'Unable to load your visit records right now' });
    }
};
