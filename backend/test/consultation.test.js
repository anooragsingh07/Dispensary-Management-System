const test = require('node:test');
const assert = require('node:assert/strict');
const { validateConsultation, validatePrescriptions } = require('../Controllers/consultation')._validation;
const Authentication = require('../Authentication/auth');

const validConsultation = () => ({
    visitAt: new Date().toISOString(),
    chiefComplaint: 'Headache',
    symptoms: 'Pain since this morning',
    vitals: { temperatureC: '37.2', bloodPressure: '120/80', pulseBpm: '74', other: 'SpO2 98%' },
    diagnosis: 'Mild headache',
    doctorAdvice: 'Rest and hydration',
    precautions: 'Return if symptoms worsen',
    clinicalNotes: 'Private review note',
});

test('consultation validation normalizes dates and measured vitals', () => {
    const result = validateConsultation(validConsultation());
    assert.equal(result.error, undefined);
    assert.ok(result.value.visitAt instanceof Date);
    assert.equal(result.value.vitals.temperatureC, 37.2);
    assert.equal(result.value.vitals.pulseBpm, 74);
    assert.equal(result.value.vitals.bloodPressure, '120/80');
});

test('consultation validation rejects missing clinical requirements and malformed measurements', () => {
    assert.match(validateConsultation({ ...validConsultation(), chiefComplaint: ' ' }).error, /chiefComplaint is required/);
    assert.match(validateConsultation({ ...validConsultation(), diagnosis: '' }).error, /diagnosis is required/);
    assert.match(validateConsultation({ ...validConsultation(), vitals: { bloodPressure: 'high' } }).error, /format 120\/80/);
    assert.match(validateConsultation({ ...validConsultation(), vitals: { pulseBpm: 0 } }).error, /Pulse must be between/);
    assert.match(validateConsultation({ ...validConsultation(), visitAt: 'not-a-date' }).error, /valid visit date/);
});

test('prescription validation requires complete instructions and stock-backed dispensing', () => {
    const id = '64b64c5f7b2b3d2a1c9a1201';
    const valid = validatePrescriptions([{ medicineId: id, medicineName: 'Paracetamol', dosage: '1 tablet', frequency: 'Twice daily', duration: '3 days', dispensedQuantity: '2' }]);
    assert.equal(valid.error, undefined);
    assert.equal(valid.value[0].dispensedQuantity, 2);
    assert.match(validatePrescriptions([{ medicineName: 'Paracetamol', dosage: '', frequency: 'Daily', duration: '3 days' }]).error, /dosage is required/);
    assert.match(validatePrescriptions([{ medicineName: 'Paracetamol', dosage: '1 tablet', frequency: 'Daily', duration: '3 days', dispensedQuantity: 1 }]).error, /selected from stock/);
});

test('role guards reject students from clinical routes and clinicians from student-only routes', () => {
    const callGuard = (middleware, role) => {
        let status = 200;
        let payload;
        let nextCalled = false;
        const req = { user: { role } };
        const res = { status(code) { status = code; return this; }, json(value) { payload = value; return this; } };
        middleware(req, res, () => { nextCalled = true; });
        return { status, payload, nextCalled };
    };
    assert.equal(callGuard(Authentication.adminFacultyAuth[1], 'student').status, 403);
    assert.equal(callGuard(Authentication.adminFacultyAuth[1], 'employee').status, 403);
    assert.equal(callGuard(Authentication.studentAuth[1], 'doctor').status, 403);
    assert.equal(callGuard(Authentication.studentAuth[1], 'employee').nextCalled, true);
    assert.equal(callGuard(Authentication.adminFacultyAuth[1], 'doctor').nextCalled, true);
    assert.equal(callGuard(Authentication.adminStaffAuth[1], 'doctor').status, 403);
    assert.equal(callGuard(Authentication.adminStaffAuth[1], 'staff').nextCalled, true);
});
