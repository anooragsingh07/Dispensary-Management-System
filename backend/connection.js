const mongoose = require('mongoose');

const connectDatabase = async () => {
    const mongoUrl = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/public_dispensary_system';
    await mongoose.connect(mongoUrl);
    console.log('Connected to MongoDB');
    return mongoose.connection;
};

module.exports = connectDatabase;
