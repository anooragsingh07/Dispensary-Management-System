const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { query, withTransaction, newId, isId, asApi } = require('../database');
const { getUserByEmail } = require('../users');
const { getJwtSecret } = require('../Authentication/auth');

const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const studentFields = ['name', 'roll', 'employeeId', 'recordType', 'mobileNo', 'fatherName', 'fatherMobile', 'address', 'previous_health', 'age', 'bloodGroup'];
const allowedBloodGroups = new Set(['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
const cookieOptions = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/' });
const normalizeEmail = (v) => String(v || '').trim().toLowerCase();
const normalizeRoll = (v) => String(v || '').trim().toUpperCase();
const isEmail = (v) => EMAIL_PATTERN.test(v);
const isPhone = (v) => { const s = String(v || '').trim(); const n = s.replace(/\D/g, '').length; return /^\+?[0-9][0-9\s().-]{5,22}$/.test(s) && n >= 7 && n <= 15; };
const conflict = (error) => error.code === '23505';
const setAuthCookie = (res, user) => res.cookie('token', jwt.sign({ userId: user._id, authVersion: user.authVersion || 0 }, getJwtSecret(), { expiresIn: '7d' }), { ...cookieOptions(), maxAge: SESSION_LENGTH_MS });
const sanitizeUser = (user) => {
    const result = { ...user };
    delete result.password;
    const profile = result.studentId && typeof result.studentId === 'object' ? result.studentId : null;
    if (['student', 'employee'].includes(result.role) && profile) {
        result.studentId = profile._id;
        for (const field of studentFields) result[field] = profile[field] ?? '';
    }
    return result;
};
const studentResponse = (student, user) => ({ ...student, email: user?.email || '', userId: user?._id || null });
const getStudent = async (id) => {
    const row = (await query('SELECT * FROM students WHERE id = $1', [id])).rows[0];
    return asApi(row);
};
const getPatientAccount = async (studentId) => (await query('SELECT id, email, role FROM users WHERE student_id = $1 AND is_active = true', [studentId])).rows[0];
const insertStudentAccount = async ({ profile, email, password, role }) => withTransaction(async (client) => {
    const studentId = newId();
    const userId = newId();
    const s = profile;
    await client.query(`INSERT INTO students (id,name,record_type,roll,employee_id,mobile_no,father_name,father_mobile,address,previous_health,age,blood_group)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [studentId,s.name,s.recordType,s.roll,s.employeeId,s.mobileNo,s.fatherName,s.fatherMobile,s.address,s.previous_health,s.age ?? null,s.bloodGroup]);
    await client.query('INSERT INTO users (id,email,password,role,student_id) VALUES ($1,$2,$3,$4,$5)', [userId,email,password,role,studentId]);
    const user = { _id:userId,name:profile.name,role,authVersion:0,email,studentId:{_id:studentId,...profile} };
    return { student:{_id:studentId,...profile}, user };
});

const normalizeStudentFields = (body, current = {}, { requireMobile = true } = {}) => {
    const data = {};
    for (const field of studentFields) {
        const column = field === 'previous_health' ? 'previous_health' : field;
        const value = body[field] !== undefined ? body[field] : current[field];
        if (value === undefined) continue;
        data[column] = field === 'age' ? (String(value ?? '').trim() ? Number(value) : null) : String(value ?? '').trim();
    }
    const recordType = String(body.recordType || current.recordType || 'student').trim().toLowerCase();
    if (!['student','employee'].includes(recordType)) return { error: 'Choose student or college employee registration' };
    const campusId = recordType === 'employee'
        ? normalizeRoll(body.employeeId ?? body.roll ?? current.employeeId ?? current.roll)
        : normalizeRoll(body.roll ?? current.roll);
    Object.assign(data, { recordType, roll: campusId, employeeId: recordType === 'employee' ? campusId : '' });
    if (!data.name || data.name.length > 120) return { error: 'Enter a patient name of 1 to 120 characters' };
    if (!campusId || campusId.length > 50) return { error: recordType === 'employee' ? 'Enter an employee ID of 1 to 50 characters' : 'Enter a roll number of 1 to 50 characters' };
    if (requireMobile && !data.mobileNo) return { error: 'Patient mobile number is required' };
    if (data.mobileNo && (data.mobileNo.length > 24 || !isPhone(data.mobileNo))) return { error: 'Enter a valid patient mobile number' };
    if (data.fatherName?.length > 120) return { error: 'Guardian name must be 120 characters or fewer' };
    if (data.fatherMobile && (data.fatherMobile.length > 24 || !isPhone(data.fatherMobile))) return { error: 'Enter a valid guardian mobile number' };
    if (data.address?.length > 500) return { error: 'Address must be 500 characters or fewer' };
    if (data.previous_health?.length > 2000) return { error: 'Previous health details must be 2000 characters or fewer' };
    if (data.age !== undefined && data.age !== null && (!Number.isInteger(data.age) || data.age < 1 || data.age > 130)) return { error: 'Age must be a whole number from 1 to 130' };
    if (data.bloodGroup && !allowedBloodGroups.has(data.bloodGroup.toUpperCase())) return { error: 'Choose a valid blood group' };
    data.bloodGroup = (data.bloodGroup || '').toUpperCase();
    for (const field of studentFields) if (data[field] === undefined) data[field] = field === 'age' ? null : '';
    return { data };
};

exports.register = async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || '');
        const accountType = String(req.body.accountType || 'student').trim().toLowerCase();
        const campusId = accountType === 'employee' ? normalizeRoll(req.body.employeeId) : normalizeRoll(req.body.roll);
        if (!['student','employee'].includes(accountType)) return res.status(400).json({ error: 'Choose student or college employee registration' });
        if (!name || !email || !password || !campusId) return res.status(400).json({ error: `Name, email, password and ${accountType === 'employee' ? 'employee ID' : 'roll number'} are required` });
        if (name.length > 120 || !isEmail(email) || password.length < 8 || password.length > 128 || campusId.length > 50) return res.status(400).json({ error: 'Enter valid account details and a password of at least 8 characters' });
        const normalized = normalizeStudentFields({ ...req.body, name, roll: campusId, employeeId: accountType === 'employee' ? campusId : '', recordType: accountType }, {}, { requireMobile: false });
        if (normalized.error) return res.status(400).json({ error: normalized.error });
        const { user, student } = await insertStudentAccount({ profile: normalized.data, email, password: await bcrypt.hash(password, 12), role: accountType });
        setAuthCookie(res, user);
        return res.status(201).json({ message: 'Your campus health account is ready', user: sanitizeUser(user) });
    } catch (error) {
        if (conflict(error)) return res.status(409).json({ error: 'An account already exists with that email or campus ID' });
        console.error('Patient registration failed:', error.message);
        return res.status(500).json({ error: 'Unable to create your account right now' });
    }
};

exports.login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email); const password = String(req.body.password || '');
        if (!email || !password || !isEmail(email)) return res.status(401).json({ error: 'Email or password is incorrect' });
        const user = await getUserByEmail(email);
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Email or password is incorrect' });
        setAuthCookie(res, user);
        return res.status(200).json({ message: 'Signed in successfully', user: sanitizeUser(user) });
    } catch (error) { console.error('Login failed:', error.message); return res.status(500).json({ error: 'Unable to sign in right now' }); }
};

exports.getCurrentUser = (req, res) => res.status(200).json({ user: sanitizeUser(req.user) });

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword = '', newPassword = '', confirmPassword = '' } = req.body || {};
        if (!currentPassword || !newPassword || !confirmPassword) return res.status(400).json({ error: 'Enter your current password and complete both new-password fields' });
        if (newPassword.length < 8 || newPassword.length > 128) return res.status(400).json({ error: 'Your new password must be between 8 and 128 characters' });
        if (newPassword !== confirmPassword) return res.status(400).json({ error: 'The new passwords do not match' });
        if (newPassword === currentPassword) return res.status(400).json({ error: 'Choose a password different from your current one' });
        const row = (await query('SELECT password, auth_version FROM users WHERE id=$1 AND is_active=true', [req.user._id])).rows[0];
        if (!row) return res.status(404).json({ error: 'Your account could not be found' });
        if (!(await bcrypt.compare(currentPassword, row.password))) return res.status(400).json({ error: 'Your current password is incorrect' });
        const updated = await query('UPDATE users SET password=$2, auth_version=auth_version+1, updated_at=now() WHERE id=$1 RETURNING auth_version', [req.user._id, await bcrypt.hash(newPassword, 12)]);
        setAuthCookie(res, { ...req.user, authVersion: updated.rows[0].auth_version });
        return res.status(200).json({ message: 'Your password has been changed successfully' });
    } catch (error) { console.error('Password change failed:', error.message); return res.status(500).json({ error: 'Unable to change your password right now' }); }
};

exports.updateStudentById = async (req, res) => {
    try {
        if (!isId(req.params.id)) return res.status(404).json({ error: 'Patient not found' });
        const student = await getStudent(req.params.id); if (!student) return res.status(404).json({ error: 'Patient not found' });
        const user = await getPatientAccount(student._id); if (!user) return res.status(404).json({ error: 'Patient login account not found' });
        const email = Object.hasOwn(req.body, 'email') ? normalizeEmail(req.body.email) : user.email;
        if (!isEmail(email)) return res.status(400).json({ error: 'Enter a valid patient email address' });
        const result = normalizeStudentFields(req.body, student); if (result.error) return res.status(400).json({ error: result.error });
        await withTransaction(async (client) => {
            await client.query('UPDATE users SET email=$2, updated_at=now() WHERE id=$1', [user.id,email]);
            const d=result.data;
            await client.query(`UPDATE students SET name=$2,record_type=$3,roll=$4,employee_id=$5,mobile_no=$6,father_name=$7,father_mobile=$8,address=$9,previous_health=$10,age=$11,blood_group=$12,updated_at=now() WHERE id=$1`, [student._id,d.name,d.recordType,d.roll,d.employeeId,d.mobileNo,d.fatherName,d.fatherMobile,d.address,d.previous_health,d.age,d.bloodGroup]);
        });
        const updated = await getStudent(student._id);
        return res.status(200).json({ message: updated.recordType === 'employee' ? 'Employee details updated' : 'Student details updated', student: studentResponse(updated,{email,_id:user.id}) });
    } catch (error) { if (conflict(error)) return res.status(409).json({ error: 'That email or campus ID belongs to another account' }); console.error('Patient update failed:',error.message); return res.status(500).json({ error:'Unable to update patient details right now' }); }
};

exports.getStudentByRollNo = async (req, res) => {
    try {
        const roll=normalizeRoll(req.params.roll); const row=(await query('SELECT * FROM students WHERE roll=$1',[roll])).rows[0];
        if (!row) return res.status(404).json({error:'Patient not found'});
        const student=asApi(row); const user=await getPatientAccount(student._id);
        if (!user) return res.status(404).json({error:'Patient login account not found'});
        return res.status(200).json({student:studentResponse(student,{email:user.email,_id:user.id})});
    } catch(error) { console.error('Patient lookup failed:',error.message); return res.status(500).json({error:'Unable to find that patient right now'}); }
};

exports.issueStudentTemporaryPassword = async (req, res) => {
    try {
        if(!isId(req.params.id)) return res.status(404).json({error:'Patient not found'});
        const account=await getPatientAccount(req.params.id); if(!account||!['student','employee'].includes(account.role)) return res.status(404).json({error:'Patient login account not found'});
        const temporaryPassword=crypto.randomBytes(9).toString('base64url');
        await query('UPDATE users SET password=$2,auth_version=auth_version+1,updated_at=now() WHERE id=$1',[account.id,await bcrypt.hash(temporaryPassword,12)]);
        return res.status(200).json({message:'A new temporary password is active. Share it with the account holder.',email:account.email,temporaryPassword});
    } catch(error) { console.error('Temporary password issue failed:',error.message); return res.status(500).json({error:'Unable to issue a temporary password right now'}); }
};

exports.registerStudentByStaff = async (req, res) => {
    try {
        const email=normalizeEmail(req.body.email); const recordType=String(req.body.recordType||'student').trim().toLowerCase();
        if(!['student','employee'].includes(recordType)) return res.status(400).json({error:'Choose student or college employee registration'});
        const normalized=normalizeStudentFields({...req.body,recordType,employeeId:recordType==='employee'?(req.body.employeeId??req.body.roll):''});
        if(!isEmail(email)) return res.status(400).json({error:'Enter a valid patient email address'});
        if(normalized.error) return res.status(400).json({error:normalized.error});
        const temporaryPassword=crypto.randomBytes(6).toString('base64url');
        const {student,user}=await insertStudentAccount({profile:normalized.data,email,password:await bcrypt.hash(temporaryPassword,12),role:recordType});
        return res.status(201).json({message:recordType==='employee'?'Employee account created':'Student account created',student:studentResponse(student,user),temporaryPassword});
    } catch(error) { if(conflict(error)) return res.status(409).json({error:'An account already exists with that email or campus ID'}); console.error('Patient account creation failed:',error.message); return res.status(500).json({error:'Unable to register this patient right now'}); }
};

exports.addStaffsByAdmin = async (req,res) => {
    try {
        const name=String(req.body.name||'').trim(), email=normalizeEmail(req.body.email), password=String(req.body.password||''), designation=String(req.body.designation||'').trim(), mobileNo=String(req.body.mobileNo||'').trim();
        const role=['staff','doctor'].includes(req.body.role)?req.body.role:'staff';
        if(!name||name.length>120||!isEmail(email)||password.length<8||password.length>128||!designation||designation.length>120||!isPhone(mobileNo)) return res.status(400).json({error:'Enter a name, valid email, password of at least 8 characters, designation and mobile number'});
        const id=newId(); const row=(await query('INSERT INTO users(id,name,email,password,role,designation,mobile_no) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,name,email,role,designation,mobile_no,auth_version,created_at,updated_at',[id,name,email,await bcrypt.hash(password,12),role,designation,mobileNo])).rows[0];
        return res.status(201).json({message:role==='doctor'?'Doctor account created':'Staff account created',staff:asApi(row)});
    } catch(error) { if(conflict(error)) return res.status(409).json({error:'An account already exists with that email'}); console.error('Staff creation failed:',error.message); return res.status(500).json({error:'Unable to add staff right now'}); }
};

exports.getAllStaffs = async (_req,res) => {
    try { const rows=(await query("SELECT id,name,designation,role FROM users WHERE is_active=true AND role IN ('staff','doctor') ORDER BY name")).rows; return res.status(200).json({staffs:rows.map(asApi)}); }
    catch(error) { console.error('Staff list failed:',error.message); return res.status(500).json({error:'Unable to load staff right now'}); }
};
exports.getStaffsForManagement = async (_req,res) => {
    try { const rows=(await query("SELECT id,name,email,designation,mobile_no,role FROM users WHERE is_active=true AND role IN ('staff','doctor') ORDER BY name")).rows; return res.status(200).json({staffs:rows.map(asApi)}); }
    catch(error) { console.error('Staff management list failed:',error.message); return res.status(500).json({error:'Unable to load staff right now'}); }
};
exports.updateStaffById = async (req,res) => {
    try {
        if(!isId(req.params.id)) return res.status(404).json({error:'Staff member not found'});
        const existing=(await query("SELECT id,name,designation,mobile_no,role FROM users WHERE id=$1 AND role IN ('staff','doctor') AND is_active=true",[req.params.id])).rows[0];
        if(!existing) return res.status(404).json({error:'Staff member not found'});
        const name=req.body.name===undefined?existing.name:String(req.body.name).trim(), designation=req.body.designation===undefined?existing.designation:String(req.body.designation).trim(), mobileNo=req.body.mobileNo===undefined?existing.mobile_no:String(req.body.mobileNo).trim();
        if(!name||!designation||!isPhone(mobileNo)) return res.status(400).json({error:'Name, designation and a valid mobile number are required'});
        const row=(await query('UPDATE users SET name=$2,designation=$3,mobile_no=$4,updated_at=now() WHERE id=$1 RETURNING id,name,email,designation,mobile_no,role',[existing.id,name,designation,mobileNo])).rows[0];
        return res.status(200).json({message:'Staff details updated',staff:asApi(row)});
    } catch(error) { console.error('Staff update failed:',error.message); return res.status(500).json({error:'Unable to update this staff member right now'}); }
};
exports.deleteStaff = async (req,res) => {
    try { const row=await query("UPDATE users SET is_active=false,auth_version=auth_version+1,updated_at=now() WHERE id=$1 AND role IN ('staff','doctor') AND is_active=true RETURNING id",[req.params.id]); if(!row.rowCount) return res.status(404).json({error:'Staff member not found'}); return res.status(200).json({message:'Staff account removed'}); }
    catch(error) { console.error('Staff deletion failed:',error.message); return res.status(500).json({error:'Unable to remove this staff member right now'}); }
};
exports.logout = (_req,res) => res.clearCookie('token',cookieOptions()).json({message:'Signed out successfully'});
