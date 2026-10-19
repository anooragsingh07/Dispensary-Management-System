const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const testMongoUri = process.env.TEST_MONGO_URI || '';
let safeTestDatabase = false;
try {
    const parsed = new URL(testMongoUri);
    safeTestDatabase = /test/i.test(decodeURIComponent(parsed.pathname.replace(/^\//, '').split('/')[0] || ''));
} catch {}

test('student registration, roll lookup, consultation, prescription, history and RBAC', { skip: !safeTestDatabase }, async () => {
    process.env.MONGO_URI = testMongoUri;
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = `integration-${require('crypto').randomBytes(32).toString('hex')}`;
    const mongoose = require('mongoose');
    const connectDatabase = require('../connection');
    const app = require('../index');
    const bcrypt = require('bcryptjs');
    const User = require('../Models/user');
    const Student = require('../Models/student');
    const Medicine = require('../Models/medicine');
    const Consultation = require('../Models/consultation');
    const Prescription = require('../Models/prescription');
    const AuditLog = require('../Models/auditLog');
    const tag = require('crypto').randomBytes(5).toString('hex').toUpperCase();
    const email = `integration.${tag.toLowerCase()}@example.test`;
    const roll = `TEST-${tag}`;
    let server;
    let doctor;
    let student;
    let medicine;
    let consultationId;
    try {
        await connectDatabase();
        doctor = await User.create({ name: 'Integration Doctor', email: `doctor.${tag.toLowerCase()}@example.test`, password: await bcrypt.hash('integration-password-1', 10), role: 'doctor', designation: 'Doctor' });
        server = app.listen(0);
        await new Promise((resolve) => server.once('listening', resolve));
        const base = `http://127.0.0.1:${server.address().port}`;
        const request = async (url, options = {}) => fetch(`${base}${url}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
        const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0];

        const registration = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Integration Student', roll, email, password: 'student-password-1', mobileNo: '9000000001', bloodGroup: 'B+' }) });
        assert.equal(registration.status, 201);
        const registrationBody = await registration.json();
        student = registrationBody.user.studentId;
        assert.ok(student);
        const studentCookie = cookieFrom(registration);

        const duplicate = await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Duplicate Student', roll, email: `duplicate.${tag.toLowerCase()}@example.test`, password: 'student-password-1' }) });
        assert.equal(duplicate.status, 409);

        const login = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: doctor.email, password: 'integration-password-1' }) });
        assert.equal(login.status, 200);
        const doctorCookie = cookieFrom(login);
        const lookup = await request(`/api/auth/get-student/${roll}`, { headers: { cookie: doctorCookie } });
        assert.equal(lookup.status, 200);
        const foundStudent = (await lookup.json()).student;
        assert.equal(foundStudent._id, student);

        medicine = await Medicine.create({ name: `Integration Paracetamol ${tag}`, quantity: 10, usage: 'Test only', addedBy: doctor._id });
        const invalid = await request('/api/consultations', { method: 'POST', headers: { cookie: doctorCookie }, body: JSON.stringify({ studentId: student, chiefComplaint: '', diagnosis: '' }) });
        assert.equal(invalid.status, 400);
        const create = await request('/api/consultations', {
            method: 'POST', headers: { cookie: doctorCookie }, body: JSON.stringify({
                studentId: student, visitAt: new Date().toISOString(), chiefComplaint: 'Headache', symptoms: 'Mild headache',
                vitals: { temperatureC: 37, bloodPressure: '120/80', pulseBpm: 72 }, diagnosis: 'Mild headache',
                doctorAdvice: 'Rest', precautions: 'Return if symptoms worsen', clinicalNotes: 'Private integration note',
                prescriptions: [{ medicineId: medicine._id, medicineName: medicine.name, dosage: '1 tablet', frequency: 'Twice daily', duration: '2 days', dispensedQuantity: 2 }],
            }),
        });
        assert.equal(create.status, 201);
        const created = (await create.json()).consultation;
        consultationId = created._id;
        assert.equal(created.prescriptions.length, 1);
        assert.equal((await Medicine.findById(medicine._id)).quantity, 8);
        assert.equal(await Prescription.countDocuments({ consultationId }), 1);
        assert.equal(await AuditLog.countDocuments({ consultationId, action: 'consultation.created' }), 1);

        const update = await request(`/api/consultations/${consultationId}`, {
            method: 'PUT', headers: { cookie: doctorCookie }, body: JSON.stringify({ doctorAdvice: 'Updated advice', clinicalNotes: 'Revised private note' }),
        });
        assert.equal(update.status, 200);
        assert.equal(await AuditLog.countDocuments({ consultationId, action: 'consultation.updated' }), 1);

        const mine = await request('/api/consultations/mine', { headers: { cookie: studentCookie } });
        assert.equal(mine.status, 200);
        const studentHistory = (await mine.json()).consultations;
        assert.equal(studentHistory.length, 1);
        assert.equal(studentHistory[0].chiefComplaint, 'Headache');
        assert.equal(studentHistory[0].doctorAdvice, 'Updated advice');
        assert.equal('clinicalNotes' in studentHistory[0], false);
        const forbidden = await request(`/api/consultations/student/${student}`, { headers: { cookie: studentCookie } });
        assert.equal(forbidden.status, 403);
    } finally {
        if (server) await new Promise((resolve) => server.close(resolve));
        if (consultationId) {
            await Promise.all([Prescription.deleteMany({ consultationId }), AuditLog.deleteMany({ consultationId }), Consultation.deleteOne({ _id: consultationId })]);
        }
        if (medicine?._id) await Medicine.deleteOne({ _id: medicine._id });
        if (student) {
            const studentId = student._id || student;
            await Student.deleteOne({ _id: studentId });
            await User.deleteMany({ $or: [{ studentId }, { email }] });
        }
        if (doctor?._id) await User.deleteOne({ _id: doctor._id });
        await mongoose.disconnect();
    }
});
