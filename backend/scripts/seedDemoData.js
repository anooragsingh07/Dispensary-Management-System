const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDatabase = require('../connection');
const User = require('../Models/user');
const Student = require('../Models/student');
const Medicine = require('../Models/medicine');
const History = require('../Models/history');
const Facility = require('../Models/facility');
const Hospital = require('../Models/nearByHospitals');
const Notification = require('../Models/notification');
const Gallery = require('../Models/gallary');
const { migrateStudents, migrateHistory, dropLegacyRollIndex } = require('./migrateMedicalRecords');

const upsert = (Model, match, values) => Model.findOneAndUpdate(
    match,
    { $setOnInsert: values },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
);

const upsertDemoUser = async (account) => {
    const password = String(process.env[account.passwordEnv] || '');
    if (password.length < 12) {
        throw new Error(account.passwordEnv + ' must be set in backend/.env with at least 12 characters');
    }
    if (account.role === 'student') {
        const profile = { ...account.profile, roll: String(account.profile.roll).trim().toUpperCase() };
        const student = await Student.findOneAndUpdate(
            { roll: profile.roll },
            { $set: { ...profile, name: account.name } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        const user = await User.findOneAndUpdate(
            { email: account.email },
            { $set: { email: account.email, role: 'student', password: await bcrypt.hash(password, 12), studentId: student._id } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
        );
        return { ...user.toObject(), ...student.toObject(), _id: user._id, userId: user._id, studentId: student._id };
    }
    const values = {
        name: account.name,
        email: account.email,
        role: account.role,
        password: await bcrypt.hash(password, 12),
        ...account.profile,
    };
    return User.findOneAndUpdate(
        { email: account.email },
        { $set: values },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
};

const run = async () => {
    await connectDatabase();
    await Promise.all([Student.init(), User.init(), History.init()]);
    await migrateStudents();
    await dropLegacyRollIndex();
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) throw new Error('Create the administrator first with npm run seed:admin');

    const staff = await upsertDemoUser({
        name: 'Demo Clinic Staff',
        email: 'demo.staff@dispensary.local',
        role: 'staff',
        passwordEnv: 'DEMO_STAFF_PASSWORD',
        profile: { designation: 'Dispensary Nurse', mobileNo: '9000000101' },
    });
    const students = await Promise.all([
        upsertDemoUser({
            name: 'Aarav Sharma',
            email: 'demo.student1@dispensary.local',
            role: 'student',
            passwordEnv: 'DEMO_STUDENT_PASSWORD',
            profile: {
                roll: 'DEMO-2026-001', mobileNo: '9000000201', age: 20,
                fatherName: 'Rajesh Sharma', fatherMobile: '9000000202',
                address: 'Demo residence, Main Campus', bloodGroup: 'B+',
                previous_health: 'Seasonal allergies',
            },
        }),
        upsertDemoUser({
            name: 'Ananya Patel',
            email: 'demo.student2@dispensary.local',
            role: 'student',
            passwordEnv: 'DEMO_STUDENT_PASSWORD',
            profile: {
                roll: 'DEMO-2026-002', mobileNo: '9000000203', age: 19,
                fatherName: 'Kiran Patel', fatherMobile: '9000000204',
                address: 'Demo residence, North Campus', bloodGroup: 'O+',
                previous_health: 'No known history',
            },
        }),
    ]);

    const medicineRows = [
        ['DEMO — Paracetamol 500 mg', 120, 'For fever or mild pain. Follow clinician instructions.'],
        ['DEMO — Cetirizine 10 mg', 45, 'For allergy symptoms. May cause drowsiness.'],
        ['DEMO — Oral Rehydration Salts', 80, 'Dissolve one sachet in the stated amount of clean water.'],
        ['DEMO — Ibuprofen 200 mg', 60, 'For pain or inflammation. Take only as directed by a clinician.'],
        ['DEMO — Antiseptic Wipes', 35, 'For external first aid use only.'],
        ['DEMO — Vitamin C 500 mg', 72, 'Use only as directed by a clinician.'],
    ];
    const medicines = await Promise.all(medicineRows.map(([name, quantity, usage]) => upsert(
        Medicine, { name }, { name, quantity, usage, addedBy: admin._id },
    )));

    const medicineByName = new Map(medicines.map((item) => [item.name, item]));
    const historyRows = [
        { student: students[0], at: '2026-10-12T09:30:00.000Z', symptoms: 'Headache reported during the demo visit.', items: [['DEMO — Paracetamol 500 mg', 2, 'As directed by clinic staff.']] },
        { student: students[0], at: '2026-10-16T11:15:00.000Z', symptoms: 'Seasonal allergy symptoms reported.', items: [['DEMO — Cetirizine 10 mg', 1, 'As directed by clinic staff.'], ['DEMO — Oral Rehydration Salts', 1, 'Prepare according to the packet directions.']] },
        { student: students[1], at: '2026-10-14T13:00:00.000Z', symptoms: 'Minor skin irritation reported during the demo visit.', items: [['DEMO — Antiseptic Wipes', 2, 'Use externally as directed.'], ['DEMO — Paracetamol 500 mg', 1, 'As directed by clinic staff.']] },
        { student: students[1], at: '2026-10-18T10:00:00.000Z', symptoms: 'General wellness consultation in the demo data.', items: [['DEMO — Vitamin C 500 mg', 1, 'As directed by clinic staff.']] },
    ];
    await Promise.all(historyRows.map(async ({ student, at, symptoms, items }) => {
        const createdAt = new Date(at);
        const visitMeds = items.map(([name, requiredQuantity, dosage]) => ({ name, requiredQuantity, dosage }));
        const signature = JSON.stringify(visitMeds.map(({ name, requiredQuantity }) => ({ name, requiredQuantity })));
        const studentVisits = await History.find({ student: student._id }).sort({ createdAt: 1 });
        const existingVisits = studentVisits.filter((visit) => JSON.stringify(visit.medicines.map((medicine) => ({
            name: medicine.name,
            requiredQuantity: medicine.requiredQuantity,
        }))) === signature);

        if (existingVisits.length) {
            const [keep, ...duplicates] = existingVisits;
            keep.roll = student.roll;
            keep.symptoms = symptoms;
            keep.medicines = visitMeds;
            await keep.save();
            if (duplicates.length) await History.deleteMany({ _id: { $in: duplicates.map((visit) => visit._id) } });
            return;
        }

        await History.create({ roll: student.roll, student: student._id, symptoms, medicines: visitMeds, createdAt });
    }));

    const facilities = [
        ['DEMO — First Aid Room', 'Basic first aid, dressing supplies and initial assessment during campus hours.'],
        ['DEMO — Rest and Recovery Area', 'A supervised space for students who need short-term observation and rest.'],
        ['DEMO — Health Counselling', 'Private health guidance and referrals to qualified care providers.'],
    ];
    await Promise.all(facilities.map(([title, description]) => upsert(
        Facility, { title }, { title, description, addedBy: admin._id },
    )));

    const hospitals = [
        ['DEMO — City General Hospital', '12 College Road, Main Campus District', '+91-90000-03001'],
        ['DEMO — Community Health Centre', '8 Market Street, Main Campus District', '+91-90000-03002'],
        ['DEMO — University Emergency Clinic', 'North Gate, University Campus', '+91-90000-03003'],
    ];
    await Promise.all(hospitals.map(([name, address, contact]) => upsert(
        Hospital, { name }, { name, address, contact, addedBy: admin._id },
    )));

    const notices = [
        'DEMO — Dispensary hours: Monday to Saturday, 9:00 AM to 5:00 PM.',
        'DEMO — Please bring your student ID when visiting the dispensary.',
        'DEMO — For emergencies, contact local emergency services immediately.',
    ];
    await Promise.all(notices.map((title) => upsert(
        Notification, { title }, { title, addedBy: admin._id },
    )));

    const images = [
        'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1584982751601-97dcc096659c?auto=format&fit=crop&w=1200&q=80',
        'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
    ];
    await Promise.all(images.map((link) => upsert(
        Gallery, { link }, { link, addedBy: admin._id },
    )));

    await migrateStudents();
    await migrateHistory();

    const counts = await Promise.all([
        User.countDocuments({ role: 'staff', email: 'demo.staff@dispensary.local' }),
        User.countDocuments({ role: 'student', email: /^demo\.student[12]@dispensary\.local$/ }),
        Medicine.countDocuments({ name: /^DEMO — / }),
        History.countDocuments({ roll: /^DEMO-2026-/ }),
        Facility.countDocuments({ title: /^DEMO — / }),
        Hospital.countDocuments({ name: /^DEMO — / }),
        Notification.countDocuments({ title: /^DEMO — / }),
        Gallery.countDocuments({ link: { $in: images } }),
    ]);
    console.log('Demo data is ready: 1 staff account, 2 student accounts, ' + counts[2] + ' medicines, ' + counts[3] + ' visit records, ' + counts[4] + ' facilities, ' + counts[5] + ' hospitals, ' + counts[6] + ' notices, and ' + counts[7] + ' gallery images.');
};

run()
    .catch((error) => {
        console.error('Could not seed demo data:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.disconnect();
    });
