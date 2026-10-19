const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const connectDatabase = require('../connection');
const User = require('../Models/user');

const seedAdmin = async () => {
    const name = String(process.env.ADMIN_NAME || '').trim();
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const password = String(process.env.ADMIN_PASSWORD || '');
    if (!name || !email || password.length < 12) {
        throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters in backend/.env');
    }

    await connectDatabase();
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
        if (existingAdmin.email === email) {
            console.log(`Administrator ${email} is already set up`);
            return;
        }
        throw new Error('An administrator already exists. Create additional accounts from the staff management screen.');
    }

    const existingAccount = await User.findOne({ email });
    if (existingAccount) throw new Error('That email already belongs to a non-administrator account');

    await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'admin' });
    console.log(`Administrator ${email} created`);
};

seedAdmin()
    .catch((error) => {
        console.error('Could not create administrator:', error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
    });
