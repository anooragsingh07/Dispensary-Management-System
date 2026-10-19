const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDatabase = require('./connection');

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin(origin, callback) {
        const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
            && /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(origin || '');
        if (!origin || allowedOrigins.includes(origin) || isLocalDevelopmentOrigin) return callback(null, true);
        return callback(new Error('This website is not allowed to access the API'));
    },
}));

app.get('/api/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/api/auth', require('./Routes/user'));
app.use('/api/medicine', require('./Routes/medicine'));
app.use('/api/history', require('./Routes/history'));
app.use('/api/consultations', require('./Routes/consultation'));
app.use('/api/facility', require('./Routes/facility'));
app.use('/api/hospital', require('./Routes/nearByHospital'));
app.use('/api/notification', require('./Routes/notification'));
app.use('/api/gallary', require('./Routes/gallary'));

app.use((req, res) => res.status(404).json({ error: `No API route for ${req.method} ${req.path}` }));
app.use((error, _req, res, _next) => {
    console.error('Request failed:', error);
    const status = error.status || 500;
    return res.status(status).json({ error: status === 500 ? 'The request could not be completed' : error.message });
});

const start = async () => {
    if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET must be set before starting in production');
    }
    await connectDatabase();
    const port = Number(process.env.PORT) || 4000;
    const server = app.listen(port, () => console.log(`Dispensary API listening on port ${port}`));

    const shutdown = async () => {
        server.close();
        const mongoose = require('mongoose');
        await mongoose.disconnect();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
};

if (require.main === module) {
    start().catch((error) => {
        console.error('Could not start the dispensary API:', error.message);
        process.exitCode = 1;
    });
}

module.exports = app;
