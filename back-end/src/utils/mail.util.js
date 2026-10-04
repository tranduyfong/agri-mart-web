const transport=require('../configs/mailer.config');
exports.sendAuthCode=async(email,code,purpose)=>{
 const action=purpose==='REGISTER'?'xác minh đăng ký':'khôi phục mật khẩu';
 const info=await transport().sendMail({from:process.env.EMAIL_USER,to:email,
  subject:`Mã ${action} tài khoản`,
  text:`Mã ${action} của bạn: ${code}\nMã có hiệu lực 10 phút. Không chia sẻ mã này cho người khác.\nNếu không thực hiện yêu cầu này, bạn có thể bỏ qua email.`});
 if(!info.accepted||info.accepted.length===0)throw new Error('Email was not accepted');
};
