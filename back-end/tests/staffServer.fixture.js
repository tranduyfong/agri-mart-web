// Chỉ dùng bởi kiểm thử tích hợp: tuyệt đối không gửi email ra ngoài.
require('../src/configs/mailer.config').sendMail = async ({ to }) => ({ accepted: [to], rejected: [] });
require('../src/index');
