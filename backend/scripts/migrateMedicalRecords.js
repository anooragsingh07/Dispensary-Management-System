const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const connectDatabase = require('../connection');
const Student = require('../Models/student');
const User = require('../Models/user');
const History = require('../Models/history');
const Consultation = require('../Models/consultation');
const Prescription = require('../Models/prescription');

const text = (value) => typeof value === 'string' ? value.trim() : '';
const rollOf = (value) => text(value).toUpperCase();
const bloodGroups = new Set(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const migrateStudents = async () => {
    const users = await User.collection.find({ role: 'student' }).toArray();
    let linked = 0;
    for (const user of users) {
        if (user.studentId && await Student.exists({ _id: user.studentId })) {
            const unset = {};
            for (const field of ['name', 'roll', 'mobileNo', 'fatherName', 'fatherMobile', 'address', 'previous_health', 'age', 'bloodGroup']) {
                if (user[field] !== undefined) unset[field] = '';
            }
            if (Object.keys(unset).length) await User.collection.updateOne({ _id: user._id }, { $unset: unset });
            continue;
        }
        const roll = rollOf(user.roll);
        if (!roll) {
            console.warn(`Skipping legacy student account ${user._id}: no roll number is stored`);
            continue;
        }
        const name = text(user.name);
        if (!name) {
            console.warn(`Skipping legacy student account ${user._id}: no student name is stored`);
            continue;
        }
        const mobileNo = text(user.mobileNo);
        const age = Number(user.age);
        const bloodGroup = text(user.bloodGroup).toUpperCase();
        if (bloodGroup && !bloodGroups.has(bloodGroup)) console.warn(`Student ${roll} has an unrecognized blood group; leaving it blank in the new profile`);
        const profile = {
            name,
            roll,
            mobileNo,
            fatherName: text(user.fatherName),
            fatherMobile: text(user.fatherMobile),
            address: text(user.address),
            previous_health: text(user.previous_health),
            ...(Number.isInteger(age) && age >= 1 && age <= 130 ? { age } : {}),
            bloodGroup: bloodGroups.has(bloodGroup) ? bloodGroup : '',
        };
        const student = await Student.findOneAndUpdate(
            { roll },
            { $setOnInsert: profile },
            { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true },
        );
        const unset = {};
        for (const field of ['name', 'roll', 'mobileNo', 'fatherName', 'fatherMobile', 'address', 'previous_health', 'age', 'bloodGroup']) unset[field] = '';
        await User.collection.updateOne({ _id: user._id }, { $set: { studentId: student._id }, $unset: unset });
        linked += 1;
    }
    return linked;
};

const migrateHistory = async () => {
    const histories = await History.find({}).lean();
    let consultationsCreated = 0;
    let prescriptionsCreated = 0;
    for (const history of histories) {
        const account = await User.collection.findOne({ _id: history.student, role: 'student' }, { projection: { studentId: 1 } });
        const studentId = account?.studentId;
        if (!studentId || !await Student.exists({ _id: studentId })) {
            console.warn(`Skipping visit ${history._id}: its student profile could not be linked`);
            continue;
        }
        let consultation = await Consultation.findOne({ legacyHistoryId: history._id });
        if (!consultation) {
            consultation = await Consultation.create({
                studentId,
                doctorId: null,
                visitAt: history.createdAt || new Date(),
                chiefComplaint: 'Legacy dispensary record',
                symptoms: text(history.symptoms),
                diagnosis: '',
                legacyHistoryId: history._id,
            });
            consultationsCreated += 1;
        }
        const items = Array.isArray(history.medicines) ? history.medicines : [];
        for (const [index, medicine] of items.entries()) {
            const result = await Prescription.updateOne(
                { legacyHistoryId: history._id, legacyItemIndex: index },
                { $setOnInsert: {
                    consultationId: consultation._id,
                    medicineName: text(medicine.name) || 'Unspecified medicine',
                    dosage: text(medicine.dosage),
                    frequency: '',
                    duration: '',
                    dispensedQuantity: Number(medicine.requiredQuantity) || 0,
                    legacyHistoryId: history._id,
                    legacyItemIndex: index,
                } },
                { upsert: true, runValidators: true },
            );
            if (result.upsertedCount) prescriptionsCreated += 1;
        }
    }
    return { consultationsCreated, prescriptionsCreated };
};

const dropLegacyRollIndex = async () => {
    const oldRollIndex = await User.collection.indexes().then((indexes) => indexes.find((index) => index.key?.roll && Object.keys(index.key).length === 1));
    if (oldRollIndex) await User.collection.dropIndex(oldRollIndex.name);
};

const run = async () => {
    await connectDatabase();
    await Promise.all([Student.init(), User.init(), Consultation.init(), Prescription.init()]);
    const linkedStudents = await migrateStudents();
    const { consultationsCreated, prescriptionsCreated } = await migrateHistory();
    await dropLegacyRollIndex();
    console.log(`Medical record migration complete: ${linkedStudents} student profiles linked, ${consultationsCreated} consultations created, ${prescriptionsCreated} prescription items created.`);
};

module.exports = { migrateStudents, migrateHistory, dropLegacyRollIndex };

if (require.main === module) {
    run()
        .catch((error) => {
            console.error('Medical record migration failed:', error.message);
            process.exitCode = 1;
        })
        .finally(async () => { await mongoose.disconnect(); });
}
