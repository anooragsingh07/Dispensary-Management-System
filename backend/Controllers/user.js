const User = require('../Models/user');
const Student = require('../Models/student');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getJwtSecret } = require('../Authentication/auth');

const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeRoll = (roll) => String(roll || '').trim().toUpperCase();
const isEmail = (email) => EMAIL_PATTERN.test(email);
const isPhone = (phone) => {
    const value = String(phone || '').trim();
    const digits = value.replace(/\D/g, '').length;
    return /^\+?[0-9][0-9\s().-]{5,22}$/.test(value) && digits >= 7 && digits <= 15;
};

const studentFields = ['name', 'roll', 'employeeId', 'recordType', 'mobileNo', 'fatherName', 'fatherMobile', 'address', 'previous_health', 'age', 'bloodGroup'];
const allowedBloodGroups = new Set(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const normalizeStudentFields = (body, current = {}, { requireMobile = true } = {}) => {
    const data = Object.fromEntries(studentFields
        .filter((field) => !['roll', 'employeeId', 'recordType'].includes(field) && Object.prototype.hasOwnProperty.call(current, field))
        .map((field) => [field, current[field]]));
    for (const field of studentFields) {
        if (['roll', 'employeeId', 'recordType'].includes(field) || !Object.prototype.hasOwnProperty.call(body, field)) continue;
        const value = body[field];
        data[field] = field === 'age'
            ? (String(value ?? '').trim() ? Number(value) : undefined)
            : String(value ?? '').trim();
    }
    const recordType = current.recordType || String(body.recordType || 'student').trim().toLowerCase();
    if (!['student', 'employee'].includes(recordType)) return { error: 'Choose student or college employee registration' };
    const campusId = recordType === 'employee'
        ? normalizeRoll(body.employeeId ?? body.roll ?? current.employeeId ?? current.roll)
        : normalizeRoll(body.roll ?? current.roll);
    data.recordType = recordType;
    data.roll = campusId;
    data.employeeId = recordType === 'employee' ? campusId : '';
    if (!data.name || data.name.length > 120) return { error: 'Enter a student name of 1 to 120 characters' };
    if (!campusId || campusId.length > 50) return { error: recordType === 'employee' ? 'Enter an employee ID of 1 to 50 characters' : 'Enter a roll number of 1 to 50 characters' };
    if (requireMobile && !data.mobileNo) return { error: 'Student mobile number is required' };
    if (data.mobileNo && (data.mobileNo.length > 24 || !isPhone(data.mobileNo))) return { error: 'Enter a valid student mobile number' };
    if (data.fatherName?.length > 120) return { error: 'Guardian name must be 120 characters or fewer' };
    if (data.fatherMobile && (data.fatherMobile.length > 24 || !isPhone(data.fatherMobile))) return { error: 'Enter a valid guardian mobile number' };
    if (data.address?.length > 500) return { error: 'Address must be 500 characters or fewer' };
    if (data.previous_health?.length > 2000) return { error: 'Previous health details must be 2000 characters or fewer' };
    if (data.age !== undefined && (!Number.isInteger(data.age) || data.age < 1 || data.age > 130)) return { error: 'Age must be a whole number from 1 to 130' };
    if (data.bloodGroup && !allowedBloodGroups.has(data.bloodGroup.toUpperCase())) return { error: 'Choose a valid blood group' };
    if (data.bloodGroup) data.bloodGroup = data.bloodGroup.toUpperCase();
    return { data };
};

const sanitizeUser = (user) => {
    const plainUser = user.toObject ? user.toObject() : { ...user };
    delete plainUser.password;
    const profile = plainUser.studentId && typeof plainUser.studentId === 'object'
        ? plainUser.studentId
        : null;
    if (['student', 'employee'].includes(plainUser.role) && profile) {
        plainUser.studentId = profile._id;
        for (const field of studentFields) {
            plainUser[field] = profile[field] ?? '';
        }
    }
    return plainUser;
};

const studentResponse = (student, user) => ({
    ...(student.toObject ? student.toObject() : student),
    email: user?.email || '',
    userId: user?._id || null,
});

const createStudentAccount = async ({ profile, email, password, role = 'student' }) => {
    const student = await Student.create(profile);
    try {
        const user = await User.create({
            email,
            password: await bcrypt.hash(password, 12),
            role,
            studentId: student._id,
        });
        return { student, user };
    } catch (error) {
        await Student.deleteOne({ _id: student._id }).catch(() => {});
        throw error;
    }
};

const setAuthCookie = (res, user) => {
    const token = require('jsonwebtoken').sign({ userId: user._id, authVersion: user.authVersion || 0 }, getJwtSecret(), { expiresIn: '7d' });
    res.cookie('token', token, { ...cookieOptions(), maxAge: SESSION_LENGTH_MS });
};

const invalidCredentials = (res) => res.status(401).json({ error: 'Email or password is incorrect' });

exports.register = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const accountType = String(req.body.accountType || 'student').trim().toLowerCase();
        const campusId = accountType === 'employee' ? normalizeRoll(req.body.employeeId) : normalizeRoll(req.body.roll);

        if (!['student', 'employee'].includes(accountType)) return res.status(400).json({ error: 'Choose student or college employee registration' });
        if (!name || !email || !password || !campusId) return res.status(400).json({ error: `Name, email, password and ${accountType === 'employee' ? 'employee ID' : 'roll number'} are required` });
        if (name.length > 120 || !isEmail(email) || password.length < 8 || password.length > 128 || campusId.length > 50) {
            return res.status(400).json({ error: `Enter a valid name, email, ${accountType === 'employee' ? 'employee ID' : 'roll number'} and a password of at least 8 characters` });
        }

        const normalized = normalizeStudentFields({ ...req.body, name, roll: campusId, employeeId: accountType === 'employee' ? campusId : '', recordType: accountType }, {}, { requireMobile: false });
        if (normalized.error) return res.status(400).json({ error: normalized.error });
        if (await User.exists({ email }) || await Student.exists({ roll: campusId })) {
            return res.status(409).json({ error: 'An account already exists with that email or campus ID' });
        }

        const { user, student } = await createStudentAccount({ profile: normalized.data, email, password, role: accountType });
        setAuthCookie(res, user);
        return res.status(201).json({
            message: accountType === 'employee' ? 'Your college employee account is ready' : 'Your student account is ready',
            user: sanitizeUser({ ...user.toObject(), studentId: student.toObject() }),
        });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'An account already exists with that email or campus ID' });
        console.error('Student registration failed:', error);
        return res.status(500).json({ error: 'Unable to create your account right now' });
    }
};

exports.login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        if (!email || !password || !isEmail(email)) return invalidCredentials(res);

        const user = await User.findOne({ email }).select('+password').populate('studentId');
        if (!user || !(await bcrypt.compare(password, user.password))) return invalidCredentials(res);

        setAuthCookie(res, user);
        return res.status(200).json({ message: 'Signed in successfully', user: sanitizeUser(user) });
    } catch (error) {
        console.error('Login failed:', error);
        return res.status(500).json({ error: 'Unable to sign in right now' });
    }
};

exports.getCurrentUser = (req, res) => res.status(200).json({ user: sanitizeUser(req.user) });

exports.updateStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const user = await User.findOne({ studentId: student._id });
        if (!user) return res.status(404).json({ error: 'Student login account not found' });

        const email = Object.prototype.hasOwnProperty.call(req.body, 'email') ? normalizeEmail(req.body.email) : user.email;
        if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid student email address' });
        const profileResult = normalizeStudentFields(req.body, student.toObject());
        if (profileResult.error) return res.status(400).json({ error: profileResult.error });
        if (await User.exists({ _id: { $ne: user._id }, email })) return res.status(409).json({ error: 'That email belongs to another account' });
        if (await Student.exists({ _id: { $ne: student._id }, roll: profileResult.data.roll })) return res.status(409).json({ error: 'That campus ID belongs to another patient' });

        const previousEmail = user.email;
        user.email = email;
        await user.save();
        try {
            Object.assign(student, profileResult.data);
            await student.save();
        } catch (error) {
            user.email = previousEmail;
            await user.save().catch(() => {});
            throw error;
        }
        return res.status(200).json({ message: student.recordType === 'employee' ? 'Employee details updated' : 'Student details updated', student: studentResponse(student, user) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'That email or roll number belongs to another account' });
        console.error('Student update failed:', error);
        return res.status(500).json({ error: 'Unable to update student details right now' });
    }
};

exports.getStudentByRollNo = async (req, res) => {
    try {
        const roll = normalizeRoll(req.params.roll);
        const student = await Student.findOne({ roll });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        const user = await User.findOne({ studentId: student._id }).select('email');
        if (!user) return res.status(404).json({ error: 'Student login account not found' });
        return res.status(200).json({ student: studentResponse(student, user) });
    } catch (error) {
        console.error('Student lookup failed:', error);
        return res.status(500).json({ error: 'Unable to find that student right now' });
    }
};

exports.issueStudentTemporaryPassword = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) return res.status(404).json({ error: 'Student not found' });

        const user = await User.findOne({ studentId: student._id });
        if (!user || !['student', 'employee'].includes(user.role)) return res.status(404).json({ error: 'Student or employee login account not found' });

        const temporaryPassword = crypto.randomBytes(9).toString('base64url');
        user.password = await bcrypt.hash(temporaryPassword, 12);
        user.authVersion = (user.authVersion || 0) + 1;
        await user.save();

        return res.status(200).json({
            message: 'A new temporary password is active. Share it with the account holder.',
            email: user.email,
            temporaryPassword,
        });
    } catch (error) {
        console.error('Student temporary password issue failed:', error);
        return res.status(500).json({ error: 'Unable to issue a temporary password right now' });
    }
};

exports.registerStudentByStaff = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const profileResult = normalizeStudentFields({ ...req.body, recordType: 'student', employeeId: '' });
        if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid student email address' });
        if (profileResult.error) return res.status(400).json({ error: profileResult.error });
        if (await User.exists({ email }) || await Student.exists({ roll: profileResult.data.roll })) {
            return res.status(409).json({ error: 'An account already exists with that email or roll number' });
        }

        const temporaryPassword = crypto.randomBytes(6).toString('base64url');
        const { student, user } = await createStudentAccount({ profile: profileResult.data, email, password: temporaryPassword });

        return res.status(201).json({
            message: 'Student account created',
            student: studentResponse(student, user),
            temporaryPassword,
        });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'An account already exists with that email or roll number' });
        console.error('Student account creation failed:', error);
        return res.status(500).json({ error: 'Unable to register this student right now' });
    }
};

exports.addStaffsByAdmin = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const designation = String(req.body.designation || '').trim();
        const mobileNo = String(req.body.mobileNo || '').trim();
        const role = ['staff', 'doctor'].includes(req.body.role) ? req.body.role : 'staff';
        if (!name || name.length > 120 || !isEmail(email) || password.length < 8 || password.length > 128 || !designation || designation.length > 120 || !isPhone(mobileNo)) {
            return res.status(400).json({ error: 'Enter a name, valid email, password of at least 8 characters, designation and mobile number' });
        }
        if (await User.exists({ email })) return res.status(409).json({ error: 'An account already exists with that email' });
        const staff = await User.create({ name, email, password: await bcrypt.hash(password, 12), designation, mobileNo, role });
        return res.status(201).json({ message: role === 'doctor' ? 'Doctor account created' : 'Staff account created', staff: sanitizeUser(staff) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'An account already exists with that email' });
        console.error('Staff creation failed:', error);
        return res.status(500).json({ error: 'Unable to add staff right now' });
    }
};

exports.getAllStaffs = async (_req, res) => {
    try {
        const staffs = await User.find({ role: { $in: ['staff', 'doctor'] } }).select('name designation email mobileNo role').sort({ name: 1 });
        return res.status(200).json({ staffs });
    } catch (error) {
        console.error('Staff list failed:', error);
        return res.status(500).json({ error: 'Unable to load staff right now' });
    }
};

exports.getStaffsForManagement = async (_req, res) => {
    try {
        const staffs = await User.find({ role: { $in: ['staff', 'doctor'] } }).select('name email designation mobileNo role').sort({ name: 1 });
        return res.status(200).json({ staffs });
    } catch (error) {
        console.error('Staff management list failed:', error);
        return res.status(500).json({ error: 'Unable to load staff right now' });
    }
};

exports.updateStaffById = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff || !['staff', 'doctor'].includes(staff.role)) return res.status(404).json({ error: 'Staff member not found' });
        for (const field of ['name', 'designation', 'mobileNo']) {
            if (req.body[field] !== undefined) staff[field] = String(req.body[field]).trim();
        }
        if (!staff.name || !staff.designation || !staff.mobileNo) return res.status(400).json({ error: 'Name, designation and mobile number are required' });
        await staff.save();
        return res.status(200).json({ message: 'Staff details updated', staff: sanitizeUser(staff) });
    } catch (error) {
        console.error('Staff update failed:', error);
        return res.status(500).json({ error: 'Unable to update this staff member right now' });
    }
};

exports.deleteStaff = async (req, res) => {
    try {
        const staff = await User.findOneAndDelete({ _id: req.params.id, role: { $in: ['staff', 'doctor'] } });
        if (!staff) return res.status(404).json({ error: 'Staff member not found' });
        return res.status(200).json({ message: 'Staff account removed' });
    } catch (error) {
        console.error('Staff deletion failed:', error);
        return res.status(500).json({ error: 'Unable to remove this staff member right now' });
    }
};

exports.logout = (req, res) => res.clearCookie('token', cookieOptions()).json({ message: 'Signed out successfully' });
