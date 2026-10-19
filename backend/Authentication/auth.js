const jwt = require('jsonwebtoken');
const UserModel = require('../Models/user');

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret && process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET must be configured in production');
    }
    return secret || 'local-development-secret-change-before-deploying';
};

exports.getJwtSecret = getJwtSecret;

exports.authenticate = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if (!token) return res.status(401).json({ error: 'Please sign in to continue' });

        const decoded = jwt.verify(token, getJwtSecret());
        const user = await UserModel.findById(decoded.userId).select('-password').populate('studentId');
        if (!user) return res.status(401).json({ error: 'Your account could not be found' });
        if (user.isActive === false) return res.status(401).json({ error: 'This account is no longer active' });
        if ((decoded.authVersion || 0) !== (user.authVersion || 0)) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });

        req.user = user;
        return next();
    } catch (error) {
        return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }
};

exports.studentAuth = [exports.authenticate, (req, res, next) => {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'This page is for student accounts' });
    return next();
}];

exports.adminFacultyAuth = [exports.authenticate, (req, res, next) => {
    if (!['admin', 'doctor', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Authorized clinical staff access is required' });
    return next();
}];

exports.adminStaffAuth = [exports.authenticate, (req, res, next) => {
    if (!['admin', 'staff'].includes(req.user.role)) return res.status(403).json({ error: 'Administrator or dispensary staff access is required' });
    return next();
}];

exports.adminAuth = [exports.authenticate, (req, res, next) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Administrator access is required' });
    return next();
}];
