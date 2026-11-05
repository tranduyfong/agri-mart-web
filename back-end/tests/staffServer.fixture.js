// Chỉ dùng bởi kiểm thử tích hợp: tuyệt đối không gửi email ra ngoài.
require('../src/configs/mailer.config').sendMail = async ({ to }) => ({ accepted: [to], rejected: [] });
process.env.GEMINI_ENABLED = 'false';
require('../src/index');
