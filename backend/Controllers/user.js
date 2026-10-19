const User = require('../Models/user');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getJwtSecret } = require('../Authentication/auth');

const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;
const PASSWORD_RESET_LENGTH_MS = 10 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL, pass: process.env.EMAIL_PASSWORD },
});

const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.COOKIE_SAME_SITE || 'lax',
    path: '/',
});

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const isEmail = (email) => EMAIL_PATTERN.test(email);
const hashSecret = (value) => crypto.createHash('sha256').update(value).digest('hex');

const sanitizeUser = (user) => {
    const plainUser = user.toObject ? user.toObject() : { ...user };
    delete plainUser.password;
    delete plainUser.resetPasswordTokenHash;
    delete plainUser.resetPasswordExpires;
    delete plainUser.resetPasswordAttempts;
    delete plainUser.passwordResetTokenHash;
    return plainUser;
};

const setAuthCookie = (res, user) => {
    const token = require('jsonwebtoken').sign({ userId: user._id, authVersion: user.authVersion || 0 }, getJwtSecret(), { expiresIn: '7d' });
    res.cookie('token', token, { ...cookieOptions(), maxAge: SESSION_LENGTH_MS });
};

const isMailConfigured = () => Boolean(process.env.EMAIL && process.env.EMAIL_PASSWORD);

const sendMail = async (message) => {
    await transporter.sendMail({ from: process.env.EMAIL, ...message });
};

const invalidCredentials = (res) => res.status(401).json({ error: 'Email or password is incorrect' });

exports.register = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const roll = String(req.body.roll || '').trim();

        if (!name || !email || !password || !roll) return res.status(400).json({ error: 'Name, email, password and roll number are required' });
        if (name.length > 120 || !isEmail(email) || password.length < 8 || password.length > 128 || roll.length > 50) {
            return res.status(400).json({ error: 'Enter a valid name, email, roll number and a password of at least 8 characters' });
        }

        const existingAccount = await User.findOne({ $or: [{ email }, { roll }] });
        if (existingAccount) return res.status(409).json({ error: 'An account already exists with that email or roll number' });

        const user = await User.create({ name, email, roll, password: await bcrypt.hash(password, 12), role: 'student' });
        setAuthCookie(res, user);
        return res.status(201).json({ message: 'Your student account is ready', user: sanitizeUser(user) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'An account already exists with that email or roll number' });
        console.error('Student registration failed:', error);
        return res.status(500).json({ error: 'Unable to create your account right now' });
    }
};

exports.login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        if (!email || !password || !isEmail(email)) return invalidCredentials(res);

        const user = await User.findOne({ email }).select('+password');
        if (!user || !(await bcrypt.compare(password, user.password))) return invalidCredentials(res);

        setAuthCookie(res, user);
        return res.status(200).json({ message: 'Signed in successfully', user: sanitizeUser(user) });
    } catch (error) {
        console.error('Login failed:', error);
        return res.status(500).json({ error: 'Unable to sign in right now' });
    }
};

exports.getCurrentUser = (req, res) => res.status(200).json({ user: sanitizeUser(req.user) });

exports.sendOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid email address' });

        if (!isMailConfigured() && process.env.NODE_ENV === 'production') {
            return res.status(503).json({ error: 'Password recovery is not configured yet' });
        }

        const user = await User.findOne({ email }).select('+resetPasswordTokenHash +resetPasswordExpires +resetPasswordAttempts');
        if (!user) return res.status(200).json({ message: 'If the account exists, a reset code will be sent shortly' });

        const otp = crypto.randomInt(100000, 1000000).toString();
        user.resetPasswordTokenHash = hashSecret(otp);
        user.resetPasswordExpires = new Date(Date.now() + PASSWORD_RESET_LENGTH_MS);
        user.resetPasswordAttempts = 0;
        user.passwordResetTokenHash = undefined;
        await user.save();

        if (isMailConfigured()) {
            await sendMail({
                to: email,
                subject: 'Dispensary account password reset',
                text: `Your password reset code is ${otp}. It expires in 10 minutes.`,
            });
            return res.status(200).json({ message: 'If the account exists, a reset code will be sent shortly' });
        }

        return res.status(200).json({ message: 'Development reset code created', devOtp: otp });
    } catch (error) {
        console.error('Password reset email failed:', error);
        return res.status(500).json({ error: 'Unable to start password recovery right now' });
    }
};

exports.verifyOtp = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const otp = String(req.body.otp || '').trim();
        if (!isEmail(email) || !/^\d{6}$/.test(otp)) return res.status(400).json({ error: 'Enter a valid email address and six-digit code' });

        const user = await User.findOne({ email }).select('+resetPasswordTokenHash +resetPasswordExpires +resetPasswordAttempts +passwordResetTokenHash');
        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires <= new Date() || user.resetPasswordAttempts >= MAX_OTP_ATTEMPTS) {
            return res.status(400).json({ error: 'That code is invalid or has expired. Request a new code.' });
        }

        if (user.resetPasswordTokenHash !== hashSecret(otp)) {
            user.resetPasswordAttempts += 1;
            if (user.resetPasswordAttempts >= MAX_OTP_ATTEMPTS) {
                user.resetPasswordTokenHash = undefined;
                user.resetPasswordExpires = undefined;
            }
            await user.save();
            return res.status(400).json({ error: 'That code is invalid or has expired. Request a new code.' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.resetPasswordTokenHash = undefined;
        user.passwordResetTokenHash = hashSecret(resetToken);
        user.resetPasswordAttempts = 0;
        await user.save();
        return res.status(200).json({ message: 'Code verified', resetToken });
    } catch (error) {
        console.error('Password reset code verification failed:', error);
        return res.status(500).json({ error: 'Unable to verify the code right now' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const newPassword = String(req.body.newPassword || '');
        const resetToken = String(req.body.resetToken || '');
        if (!isEmail(email) || newPassword.length < 8 || newPassword.length > 128 || !resetToken) {
            return res.status(400).json({ error: 'A verified reset code and a password of at least 8 characters are required' });
        }

        const user = await User.findOne({ email }).select('+passwordResetTokenHash +resetPasswordExpires');
        if (!user || !user.passwordResetTokenHash || !user.resetPasswordExpires || user.resetPasswordExpires <= new Date() || user.passwordResetTokenHash !== hashSecret(resetToken)) {
            return res.status(400).json({ error: 'Your verified reset code is invalid or has expired. Start again.' });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.authVersion = (user.authVersion || 0) + 1;
        user.passwordResetTokenHash = undefined;
        user.resetPasswordTokenHash = undefined;
        user.resetPasswordExpires = undefined;
        user.resetPasswordAttempts = 0;
        await user.save();
        return res.status(200).json({ message: 'Password updated. Please sign in with your new password.' });
    } catch (error) {
        console.error('Password update failed:', error);
        return res.status(500).json({ error: 'Unable to update your password right now' });
    }
};

exports.updateStudentById = async (req, res) => {
    try {
        const student = await User.findById(req.params.id);
        if (!student || student.role !== 'student') return res.status(404).json({ error: 'Student not found' });

        const editableFields = ['name', 'email', 'roll', 'mobileNo', 'fatherName', 'fatherMobile', 'address', 'previous_health', 'age', 'bloodGroup'];
        for (const field of editableFields) {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                if (field === 'email') student[field] = normalizeEmail(req.body[field]);
                else if (field === 'age' && String(req.body[field]).trim() === '') student[field] = undefined;
                else student[field] = req.body[field];
            }
        }
        if (!student.name || !isEmail(student.email) || !student.roll || String(student.roll).length > 50) {
            return res.status(400).json({ error: 'Student name, valid email and roll number are required' });
        }
        const duplicate = await User.findOne({ _id: { $ne: student._id }, $or: [{ email: student.email }, { roll: student.roll }] });
        if (duplicate) return res.status(409).json({ error: 'That email or roll number belongs to another account' });

        await student.save();
        return res.status(200).json({ message: 'Student details updated', student: sanitizeUser(student) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'That email or roll number belongs to another account' });
        console.error('Student update failed:', error);
        return res.status(500).json({ error: 'Unable to update student details right now' });
    }
};

exports.getStudentByRollNo = async (req, res) => {
    try {
        const roll = String(req.params.roll || '').trim();
        const student = await User.findOne({ roll, role: 'student' });
        if (!student) return res.status(404).json({ error: 'Student not found' });
        return res.status(200).json({ student: sanitizeUser(student) });
    } catch (error) {
        console.error('Student lookup failed:', error);
        return res.status(500).json({ error: 'Unable to find that student right now' });
    }
};

exports.registerStudentByStaff = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const roll = String(req.body.roll || '').trim();
        const mobileNo = String(req.body.mobileNo || '').trim();
        if (!name || !isEmail(email) || !roll || !mobileNo) return res.status(400).json({ error: 'Student name, valid email, roll number and mobile number are required' });
        if (await User.exists({ $or: [{ email }, { roll }] })) return res.status(409).json({ error: 'An account already exists with that email or roll number' });

        const temporaryPassword = crypto.randomBytes(6).toString('base64url');
        const student = await User.create({
            name, email, roll, mobileNo, role: 'student',
            fatherName: req.body.fatherName || '', fatherMobile: req.body.fatherMobile || '',
            address: req.body.address || '', previous_health: req.body.previous_health || '',
            age: req.body.age || undefined, bloodGroup: req.body.bloodGroup || '',
            password: await bcrypt.hash(temporaryPassword, 12),
        });

        let passwordDelivered = false;
        if (isMailConfigured()) {
            await sendMail({ to: email, subject: 'Your dispensary account', text: `Your account is ready. Sign in with ${email} and temporary password ${temporaryPassword}. Please change the password after signing in.` });
            passwordDelivered = true;
        }
        return res.status(201).json({ message: 'Student account created', student: sanitizeUser(student), temporaryPassword: passwordDelivered ? undefined : temporaryPassword });
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
        if (!name || !isEmail(email) || password.length < 8 || !designation || !mobileNo) {
            return res.status(400).json({ error: 'Enter a name, valid email, password of at least 8 characters, designation and mobile number' });
        }
        if (await User.exists({ email })) return res.status(409).json({ error: 'An account already exists with that email' });
        const staff = await User.create({ name, email, password: await bcrypt.hash(password, 12), designation, mobileNo, role: 'staff' });
        return res.status(201).json({ message: 'Staff account created', staff: sanitizeUser(staff) });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: 'An account already exists with that email' });
        console.error('Staff creation failed:', error);
        return res.status(500).json({ error: 'Unable to add staff right now' });
    }
};

exports.getAllStaffs = async (_req, res) => {
    try {
        const staffs = await User.find({ role: 'staff' }).select('name designation email mobileNo').sort({ name: 1 });
        return res.status(200).json({ staffs });
    } catch (error) {
        console.error('Staff list failed:', error);
        return res.status(500).json({ error: 'Unable to load staff right now' });
    }
};

exports.getStaffsForManagement = async (_req, res) => {
    try {
        const staffs = await User.find({ role: 'staff' }).select('name email designation mobileNo').sort({ name: 1 });
        return res.status(200).json({ staffs });
    } catch (error) {
        console.error('Staff management list failed:', error);
        return res.status(500).json({ error: 'Unable to load staff right now' });
    }
};

exports.updateStaffById = async (req, res) => {
    try {
        const staff = await User.findById(req.params.id);
        if (!staff || staff.role !== 'staff') return res.status(404).json({ error: 'Staff member not found' });
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
        const staff = await User.findOneAndDelete({ _id: req.params.id, role: 'staff' });
        if (!staff) return res.status(404).json({ error: 'Staff member not found' });
        return res.status(200).json({ message: 'Staff account removed' });
    } catch (error) {
        console.error('Staff deletion failed:', error);
        return res.status(500).json({ error: 'Unable to remove this staff member right now' });
    }
};

exports.logout = (req, res) => res.clearCookie('token', cookieOptions()).json({ message: 'Signed out successfully' });
