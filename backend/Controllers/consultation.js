const mongoose = require('mongoose');
const Consultation = require('../Models/consultation');
const Prescription = require('../Models/prescription');
const AuditLog = require('../Models/auditLog');
const Student = require('../Models/student');
const Medicine = require('../Models/medicine');

const textField = (body, key, max, required = false) => {
    const value = body[key] === undefined || body[key] === null ? '' : body[key];
    if (typeof value !== 'string') return { error: `${key} must be text` };
    const normalized = value.trim();
    if (normalized.length > max) return { error: `${key} must be ${max} characters or fewer` };
    if (required && !normalized) return { error: `${key} is required` };
    return { value: normalized };
};

const optionalNumber = (value, label, min, max) => {
    if (value === '' || value === undefined || value === null) return { value: undefined };
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) return { error: `${label} must be between ${min} and ${max}` };
    return { value: number };
};

const validateConsultation = (body) => {
    const result = {};
    const limits = {
        chiefComplaint: [500, true], symptoms: [2000, false], diagnosis: [2000, true],
        doctorAdvice: [2000, false], precautions: [2000, false], clinicalNotes: [4000, false],
    };
    for (const [key, [max, required]] of Object.entries(limits)) {
        const field = textField(body, key, max, required);
        if (field.error) return field;
        result[key] = field.value;
    }
    const visitAt = new Date(body.visitAt || Date.now());
    if (!Number.isFinite(visitAt.getTime()) || visitAt.getTime() > Date.now() + 5 * 60 * 1000) return { error: 'Enter a valid visit date and time that is not in the future' };
    result.visitAt = visitAt;

    const followUpRaw = body.followUpAt;
    if (followUpRaw) {
        const followUpAt = new Date(followUpRaw);
        if (!Number.isFinite(followUpAt.getTime())) return { error: 'Enter a valid follow-up date' };
        result.followUpAt = followUpAt;
    } else result.followUpAt = null;

    const sourceVitals = body.vitals || {};
    if (typeof sourceVitals !== 'object' || Array.isArray(sourceVitals)) return { error: 'Vitals must be an object' };
    const temperature = optionalNumber(sourceVitals.temperatureC, 'Temperature', 20, 50);
    if (temperature.error) return temperature;
    const pulse = optionalNumber(sourceVitals.pulseBpm, 'Pulse', 1, 300);
    if (pulse.error) return pulse;
    const bloodPressure = textField(sourceVitals, 'bloodPressure', 24);
    if (bloodPressure.error) return bloodPressure;
    if (bloodPressure.value && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(bloodPressure.value)) return { error: 'Blood pressure must use the format 120/80' };
    const other = textField(sourceVitals, 'other', 1000);
    if (other.error) return other;
    result.vitals = {
        ...(temperature.value === undefined ? {} : { temperatureC: temperature.value }),
        ...(pulse.value === undefined ? {} : { pulseBpm: pulse.value }),
        bloodPressure: bloodPressure.value,
        other: other.value,
    };
    return { value: result };
};

const validatePrescriptions = (rows) => {
    if (rows === undefined) return { value: [] };
    if (!Array.isArray(rows) || rows.length > 30) return { error: 'Prescriptions must contain no more than 30 medicines' };
    const value = [];
    for (const [index, row] of rows.entries()) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) return { error: `Medicine ${index + 1} is invalid` };
        const medicineId = row.medicineId || row._id || null;
        if (medicineId && !mongoose.isValidObjectId(medicineId)) return { error: `Medicine ${index + 1} has an invalid stock item` };
        const fields = {};
        for (const [key, max] of [['medicineName', 160], ['dosage', 200], ['frequency', 120], ['duration', 120]]) {
            const field = textField(row, key, max, true);
            if (field.error) return { error: `Medicine ${index + 1}: ${field.error}` };
            fields[key] = field.value;
        }
        const quantity = row.dispensedQuantity === undefined || row.dispensedQuantity === '' || row.dispensedQuantity === null
            ? 0 : Number(row.dispensedQuantity);
        if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1000000) return { error: `Medicine ${index + 1} must have a valid whole-number dispense quantity` };
        if (quantity > 0 && !medicineId) return { error: `Medicine ${index + 1} must be selected from stock to dispense a quantity` };
        value.push({ ...fields, medicineId, dispensedQuantity: quantity });
    }
    return { value };
};

const restoreStock = async (reserved) => {
    await Promise.allSettled(reserved.map(({ medicineId, quantity }) => Medicine.updateOne(
        { _id: medicineId },
        [{ $set: { quantity: { $add: [{ $convert: { input: '$quantity', to: 'double', onError: 0, onNull: 0 } }, quantity] } } }],
    )));
};

const buildPrescriptionRows = async (rows, reserved) => {
    const result = [];
    for (const row of rows) {
        let medicineName = row.medicineName;
        if (row.medicineId) {
            const quantity = row.dispensedQuantity;
            const filter = { _id: row.medicineId };
            let medicine;
            if (quantity > 0) {
                filter.$expr = { $gte: [{ $convert: { input: '$quantity', to: 'double', onError: 0, onNull: 0 } }, quantity] };
                medicine = await Medicine.findOneAndUpdate(filter, [
                    { $set: { quantity: { $subtract: [{ $convert: { input: '$quantity', to: 'double', onError: 0, onNull: 0 } }, quantity] } } },
                ], { new: true, projection: { name: 1 } }).lean();
                if (!medicine) {
                    const exists = await Medicine.exists({ _id: row.medicineId });
                    throw Object.assign(new Error(exists ? 'There is not enough stock for a selected medicine' : 'A selected stock item no longer exists'), { status: 409 });
                }
                reserved.push({ medicineId: row.medicineId, quantity });
            } else medicine = await Medicine.findById(row.medicineId).select('name').lean();
            if (!medicine) throw Object.assign(new Error('A selected stock item no longer exists'), { status: 409 });
            medicineName = medicine.name;
        }
        result.push({ ...row, medicineName });
    }
    return result;
};

const consultationPopulate = [{ path: 'studentId', select: 'name roll bloodGroup previous_health' }, { path: 'doctorId', select: 'name email designation' }];

exports.createConsultation = async (req, res) => {
    const reserved = [];
    let consultation;
    try {
        const body = req.body || {};
        if (!mongoose.isValidObjectId(body.studentId)) return res.status(400).json({ error: 'Choose a valid student' });
        const student = await Student.findOne({ _id: body.studentId, deletedAt: null }).select('_id');
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const clinical = validateConsultation(body);
        if (clinical.error) return res.status(400).json({ error: clinical.error });
        const prescriptions = validatePrescriptions(body.prescriptions);
        if (prescriptions.error) return res.status(400).json({ error: prescriptions.error });

        const medicineRows = await buildPrescriptionRows(prescriptions.value, reserved);
        consultation = await Consultation.create({ ...clinical.value, studentId: student._id, doctorId: req.user._id });
        if (medicineRows.length) await Prescription.insertMany(medicineRows.map((row) => ({ ...row, consultationId: consultation._id })));
        await AuditLog.create({
            actorId: req.user._id,
            action: 'consultation.created',
            consultationId: consultation._id,
            studentId: student._id,
            changedFields: Object.keys(clinical.value).filter((key) => key !== 'clinicalNotes'),
        });
        const saved = await Consultation.findById(consultation._id).select('+clinicalNotes').populate(consultationPopulate).lean();
        const savedPrescriptions = await Prescription.find({ consultationId: consultation._id }).sort({ createdAt: 1 }).lean();
        return res.status(201).json({ message: 'Consultation saved', consultation: { ...saved, prescriptions: savedPrescriptions } });
    } catch (error) {
        if (consultation) {
            await Promise.allSettled([Prescription.deleteMany({ consultationId: consultation._id }), Consultation.deleteOne({ _id: consultation._id }), AuditLog.deleteMany({ consultationId: consultation._id })]);
        }
        await restoreStock(reserved);
        if (error.status) return res.status(error.status).json({ error: error.message });
        console.error('Consultation creation failed:', error);
        return res.status(500).json({ error: 'Unable to save this consultation right now. Reserved stock was restored where possible.' });
    }
};

exports.getStudentConsultations = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.studentId)) return res.status(400).json({ error: 'Enter a valid student ID' });
        const student = await Student.findOne({ _id: req.params.studentId, deletedAt: null }).select('_id');
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const consultations = await Consultation.find({ studentId: student._id }).select('+clinicalNotes').populate(consultationPopulate).sort({ visitAt: -1 }).lean();
        const ids = consultations.map((visit) => visit._id);
        const prescriptions = await Prescription.find({ consultationId: { $in: ids } }).sort({ createdAt: 1 }).lean();
        const byConsultation = new Map();
        for (const item of prescriptions) {
            const key = String(item.consultationId);
            byConsultation.set(key, [...(byConsultation.get(key) || []), item]);
        }
        return res.status(200).json({ consultations: consultations.map((visit) => ({ ...visit, prescriptions: byConsultation.get(String(visit._id)) || [] })) });
    } catch (error) {
        console.error('Student consultation history failed:', error);
        return res.status(500).json({ error: 'Unable to load this student\'s consultations right now' });
    }
};

exports.getMyConsultations = async (req, res) => {
    try {
        const studentId = req.user.studentId?._id || req.user.studentId;
        if (!studentId) return res.status(403).json({ error: 'Your account is not linked to a student profile' });
        // The authenticated account determines studentId. Never accept an ID from the request here.
        const consultations = await Consultation.find({ studentId }).select('-clinicalNotes').populate('doctorId', 'name designation').sort({ visitAt: 1 }).lean();
        const ids = consultations.map((visit) => visit._id);
        const prescriptions = await Prescription.find({ consultationId: { $in: ids } }).select('-__v').sort({ createdAt: 1 }).lean();
        const byConsultation = new Map();
        for (const item of prescriptions) {
            const key = String(item.consultationId);
            byConsultation.set(key, [...(byConsultation.get(key) || []), item]);
        }
        return res.status(200).json({ consultations: consultations.map((visit) => {
            const { clinicalNotes, ...studentVisible } = visit;
            return { ...studentVisible, prescriptions: byConsultation.get(String(visit._id)) || [] };
        }) });
    } catch (error) {
        console.error('Student consultation history failed:', error);
        return res.status(500).json({ error: 'Unable to load your consultations right now' });
    }
};

exports.getConsultationsByDate = async (req, res) => {
    try {
        const { month, year } = req.query;
        const query = {};
        if (month || year) {
            const monthNumber = Number(month);
            const yearNumber = Number(year);
            if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12 || !Number.isInteger(yearNumber) || yearNumber < 2000 || yearNumber > new Date().getFullYear() + 1) return res.status(400).json({ error: 'Select a valid month and year' });
            query.visitAt = { $gte: new Date(yearNumber, monthNumber - 1, 1), $lt: new Date(yearNumber, monthNumber, 1) };
        }
        const consultations = await Consultation.find(query).select('+clinicalNotes').populate(consultationPopulate).sort({ visitAt: -1 }).lean();
        const prescriptions = await Prescription.find({ consultationId: { $in: consultations.map((item) => item._id) } }).sort({ createdAt: 1 }).lean();
        const byConsultation = new Map();
        for (const item of prescriptions) {
            const key = String(item.consultationId);
            byConsultation.set(key, [...(byConsultation.get(key) || []), item]);
        }
        return res.status(200).json({ consultations: consultations.map((visit) => ({ ...visit, prescriptions: byConsultation.get(String(visit._id)) || [] })) });
    } catch (error) {
        console.error('Consultations list failed:', error);
        return res.status(500).json({ error: 'Unable to load consultations right now' });
    }
};

exports.updateConsultation = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Enter a valid consultation ID' });
        const body = req.body || {};
        if (body.prescriptions !== undefined) return res.status(400).json({ error: 'Prescription items are immutable after saving; create a new consultation to record changes' });
        const consultation = await Consultation.findById(req.params.id).select('+clinicalNotes');
        if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
        if (req.user.role === 'doctor' && String(consultation.doctorId) !== String(req.user._id)) return res.status(403).json({ error: 'Doctors can edit only consultations they created' });
        if (req.user.role === 'staff') return res.status(403).json({ error: 'Only a doctor or administrator can edit clinical records' });

        const clinical = validateConsultation({
            visitAt: body.visitAt ?? consultation.visitAt,
            chiefComplaint: body.chiefComplaint ?? consultation.chiefComplaint,
            symptoms: body.symptoms ?? consultation.symptoms,
            vitals: body.vitals ?? consultation.vitals,
            diagnosis: body.diagnosis ?? consultation.diagnosis,
            doctorAdvice: body.doctorAdvice ?? consultation.doctorAdvice,
            precautions: body.precautions ?? consultation.precautions,
            followUpAt: body.followUpAt === undefined ? consultation.followUpAt : body.followUpAt,
            clinicalNotes: body.clinicalNotes ?? consultation.clinicalNotes,
        });
        if (clinical.error) return res.status(400).json({ error: clinical.error });
        const changedFields = [];
        for (const [key, value] of Object.entries(clinical.value)) {
            if (JSON.stringify(consultation[key]) !== JSON.stringify(value)) changedFields.push(key);
            consultation[key] = value;
        }
        await consultation.save();
        if (changedFields.length) await AuditLog.create({ actorId: req.user._id, action: 'consultation.updated', consultationId: consultation._id, studentId: consultation.studentId, changedFields: changedFields.filter((key) => key !== 'clinicalNotes').concat(changedFields.includes('clinicalNotes') ? ['clinicalNotes'] : []) });
        const saved = await Consultation.findById(consultation._id).select('+clinicalNotes').populate(consultationPopulate).lean();
        const prescriptions = await Prescription.find({ consultationId: consultation._id }).sort({ createdAt: 1 }).lean();
        return res.status(200).json({ message: 'Consultation updated', consultation: { ...saved, prescriptions } });
    } catch (error) {
        console.error('Consultation update failed:', error);
        return res.status(500).json({ error: 'Unable to update this consultation right now' });
    }
};

exports._validation = { validateConsultation, validatePrescriptions };
