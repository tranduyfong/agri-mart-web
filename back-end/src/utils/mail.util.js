const getOtpEmailTemplate = (otpCode) => {
    return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
            <h2 style="color: white; margin: 0;">Khôi phục mật khẩu</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; color: #333;">Chào bạn,</p>
            <p style="font-size: 16px; color: #333;">Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP dưới đây để tiếp tục quá trình. Mã này có hiệu lực trong vòng <strong>10 phút</strong>.</p>
            <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; color: #4CAF50; letter-spacing: 5px; padding: 10px 20px; border: 2px dashed #4CAF50; border-radius: 8px; background-color: #f9fff9;">
                    ${otpCode}
                </span>
            </div>
            <p style="font-size: 14px; color: #888;">Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666;">
            &copy; 2026 Hệ thống thương mại nông sản và thực phẩm tiêu dùng. All rights reserved.
        </div>
    </div>
    `;
};

module.exports = {
    getOtpEmailTemplate
};