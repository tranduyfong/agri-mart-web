const {getService}=require('../services/auth.services');
const {successResponse}=require('../utils/response.util');
const reply=(req,res,data,vi,en,status=200)=>{res.setHeader('Cache-Control','no-store');return successResponse(res,data,null,req.locale==='en'?en:vi,status);};
exports.register=async(req,res)=>reply(req,res,await getService().register(req.input),'Đã gửi mã xác minh qua email.','Verification code sent.',201);
exports.resend=async(req,res)=>{
 await getService().requestCode(req.input.email,'REGISTER');
 return reply(req,res,null,'Nếu tài khoản đang chờ xác minh và đủ điều kiện gửi lại, email sẽ được gửi.','If the account is pending and eligible, an email will be sent.');
};
exports.verifyEmail=async(req,res)=>reply(req,res,await getService().verify(req.input.email,req.input.code,'REGISTER'),'Email đã được xác minh. Bạn có thể đăng nhập.','Email verified. You can sign in.');
exports.login=async(req,res)=>reply(req,res,await getService().login(req.input.email,req.input.password),'Đăng nhập thành công.','Signed in.');
exports.forgot=async(req,res)=>{
 await getService().requestCode(req.input.email,'RESET_PASSWORD');
 return reply(req,res,null,'Nếu email thuộc tài khoản hợp lệ và đủ điều kiện gửi lại, mã khôi phục sẽ được gửi.','If the account is eligible, a reset code will be sent.');
};
exports.verifyReset=async(req,res)=>reply(req,res,await getService().verify(req.input.email,req.input.code,'RESET_PASSWORD'),'Mã hợp lệ. Hãy đặt mật khẩu mới trong 10 phút.','Code verified. Set a new password within 10 minutes.');
exports.reset=async(req,res)=>reply(req,res,await getService().reset(req.input.resetToken,req.input.newPassword),'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.','Password reset. Sign in again.');
exports.me=(req,res)=>reply(req,res,req.auth.user,'Thông tin tài khoản.','Account details.');
exports.change=async(req,res)=>reply(req,res,await getService().changePassword(req.auth,req.input.currentPassword,req.input.newPassword),'Đã đổi mật khẩu và thu hồi các phiên đăng nhập.','Password changed. All sessions revoked.');
exports.logout=async(req,res)=>reply(req,res,await getService().logout(req.auth),'Đã đăng xuất khỏi tất cả thiết bị.','Signed out on all devices.');
