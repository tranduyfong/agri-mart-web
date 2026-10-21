const mongoose = require('mongoose');
const dns = require('node:dns');

require('dotenv').config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connection = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL, {
            serverSelectionTimeoutMS: 10000
        });

        console.log('MongoDB connected successfully');

    } catch (error) {
        console.error('MongoDB connection failed:', error.message);

        throw error;
    }
};

module.exports = connection;