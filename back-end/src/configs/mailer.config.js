let transporter;
module.exports = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) throw new Error('EMAIL_USER and EMAIL_PASS are required');
    if (!transporter) transporter = require('nodemailer').createTransport({
        service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
        disableFileAccess: true, disableUrlAccess: true
    });
    return transporter;
};
