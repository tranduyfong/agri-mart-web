const AppError=require('../utils/app-error.util');
const security=require('../utils/auth-security.util');
const error=(code,status,vi,en)=>new AppError(code,status,vi,en);
const badCode=()=>error('INVALID_OR_EXPIRED_CODE',400,'Mã không hợp lệ, hết hạn hoặc đã sử dụng.','Code is invalid, expired or already used.');
const badToken=()=>error('INVALID_OR_EXPIRED_RESET_TOKEN',400,'Quyền đặt mật khẩu đã hết hạn hoặc không hợp lệ.','Invalid or expired reset token.');
const unauthorized=()=>error('UNAUTHORIZED',401,'Phiên đăng nhập không hợp lệ.','Invalid session.');
const safeUser=u=>({id:String(u.id),email:u.email,fullName:u.full_name,phone:u.phone,role:u.role_code,status:u.status,avatarFileId:u.avatar_file_id==null?null:String(u.avatar_file_id)});
// Injection enables meaningful transaction tests without real email or production DB.
function createService({db,bcrypt,jwt,mail,config}){
 const cfg=()=>config();
 async function tx(fn){
  const c=await db.getConnection();let committed=false;
  try{await c.beginTransaction();const result=await fn(c);await c.commit();committed=true;
   if(result instanceof AppError)throw result;
   return result;
  }catch(e){if(!committed)await c.rollback();throw e;}finally{c.release();}
 }
 async function byEmail(c,email){const [rows]=await c.execute('SELECT * FROM users WHERE email=? FOR UPDATE',[email]);return rows[0];}
 async function invalidate(c,id){await c.execute('UPDATE auth_challenges SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND consumed_at IS NULL',[id]);}
 async function issue(c,u,purpose){
  const [recent]=await c.execute('SELECT id FROM auth_challenges WHERE user_id=? AND purpose=? AND created_at>DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 60 SECOND) ORDER BY id DESC LIMIT 1',[u.id,purpose]);
  if(recent.length)return null;
  await c.execute('UPDATE auth_challenges SET consumed_at=UTC_TIMESTAMP(3) WHERE user_id=? AND purpose=? AND consumed_at IS NULL',[u.id,purpose]);
  const code=security.newCode();
  const [r]=await c.execute('INSERT INTO auth_challenges (user_id,purpose,code_hash,expires_at) VALUES (?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 10 MINUTE))',[u.id,purpose,security.hashCode(cfg().otpSecret,u.id,purpose,code)]);
  return {challengeId:String(r.insertId),userId:String(u.id),email:u.email,purpose,code};
 }
 async function deliver(pending,concealFailure=false){
  if(!pending)return;
  try{await mail.sendAuthCode(pending.email,pending.code,pending.purpose);}
  catch(e){
   // Invalidate only this challenge; never consume a newer resend/reset session.
   await tx(async c=>{await c.execute('SELECT id FROM users WHERE id=? FOR UPDATE',[pending.userId]);await c.execute('UPDATE auth_challenges SET consumed_at=UTC_TIMESTAMP(3) WHERE id=? AND consumed_at IS NULL',[pending.challengeId]);});
   console.error(JSON.stringify({event:'auth_email_failed'}));
   if(!concealFailure)throw error('EMAIL_SEND_FAILED',503,'Chưa gửi được email. Chờ 60 giây rồi gửi lại mã.','Email could not be sent. Wait 60 seconds and request another code.');
  }
 }
 async function register(input){
  const passwordHash=await bcrypt.hash(input.password,cfg().bcryptRounds);
  let pending;
  try{pending=await tx(async c=>{
   let u=await byEmail(c,input.email);
   if(u&&(u.status!=='PENDING'||u.deleted_at))throw error('EMAIL_ALREADY_REGISTERED',409,'Email đã được đăng ký.','Email is already registered.');
   if(!u){
    const [roles]=await c.execute("SELECT id FROM roles WHERE code='customer' LIMIT 1");
    if(!roles.length)throw error('AUTH_NOT_CONFIGURED',503,'Chưa có vai trò customer. Chạy file khởi tạo vai trò.','Run the roles seed first.');
    const [r]=await c.execute("INSERT INTO users (role_id,email,password_hash,full_name,phone,status) VALUES (?,?,?,?,?,'PENDING')",[roles[0].id,input.email,passwordHash,input.fullName,input.phone]);
    u={id:String(r.insertId),email:input.email};
   }
   const challenge=await issue(c,u,'REGISTER');
   if(!challenge)throw error('OTP_COOLDOWN',429,'Chờ 60 giây trước khi yêu cầu mã mới.','Wait 60 seconds before requesting another code.');
   // Pending re-registration updates credentials only together with a NEW code.
   await c.execute('UPDATE users SET password_hash=?,full_name=?,phone=? WHERE id=?',[passwordHash,input.fullName,input.phone,u.id]);
   return challenge;
  });}catch(e){if(e.code==='ER_DUP_ENTRY')throw error('REGISTRATION_CONFLICT',409,'Yêu cầu đăng ký trùng. Vui lòng thử lại.','Concurrent registration; please retry.');throw e;}
  await deliver(pending);return {email:input.email,requiresEmailVerification:true};
 }
 async function requestCode(email,purpose){
  const pending=await tx(async c=>{
   const u=await byEmail(c,email);
   if(!u||u.deleted_at||u.status!==(purpose==='REGISTER'?'PENDING':'ACTIVE'))return null;
   return issue(c,u,purpose);
  });
  // Generic success for unknown email, cooldown, locked account and SMTP failure.
  await deliver(pending,true);return null;
 }
 async function verify(email,code,purpose){
  return tx(async c=>{
   const u=await byEmail(c,email);
   if(!u||u.deleted_at||u.status!==(purpose==='REGISTER'?'PENDING':'ACTIVE'))return badCode();
   const [rows]=await c.execute('SELECT *,expires_at>UTC_TIMESTAMP(3) AS is_live FROM auth_challenges WHERE user_id=? AND purpose=? ORDER BY id DESC LIMIT 1 FOR UPDATE',[u.id,purpose]);
   const ch=rows[0];
   if(!ch||ch.consumed_at||ch.verified_at||!Number(ch.is_live)||ch.attempts>=ch.max_attempts)return badCode();
   if(!security.matches(ch.code_hash,security.hashCode(cfg().otpSecret,u.id,purpose,code))){
    await c.execute('UPDATE auth_challenges SET attempts=attempts+1 WHERE id=?',[ch.id]);
    return badCode(); // Commit attempts even though HTTP outcome is 400.
   }
   if(purpose==='REGISTER'){
    await c.execute("UPDATE users SET status='ACTIVE',email_verified_at=UTC_TIMESTAMP(3) WHERE id=?",[u.id]);
    await c.execute('UPDATE auth_challenges SET verified_at=UTC_TIMESTAMP(3),consumed_at=UTC_TIMESTAMP(3) WHERE id=?',[ch.id]);
    return {email:u.email,verified:true};
   }
   const token=security.newToken();
   await c.execute('UPDATE auth_challenges SET verified_at=UTC_TIMESTAMP(3),reset_token_hash=?,reset_expires_at=DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 10 MINUTE) WHERE id=?',[security.hashToken(token),ch.id]);
   return {resetToken:token,expiresInSeconds:600};
  });
 }
 async function reset(resetToken,newPassword){
  const hashed=security.hashToken(resetToken);
  const [lookup]=await db.execute('SELECT user_id FROM auth_challenges WHERE reset_token_hash=? LIMIT 1',[hashed]);
  if(!lookup.length)throw badToken();
  const newHash=await bcrypt.hash(newPassword,cfg().bcryptRounds);
  return tx(async c=>{
   const [users]=await c.execute('SELECT * FROM users WHERE id=? FOR UPDATE',[lookup[0].user_id]);const u=users[0];
   if(!u||u.status!=='ACTIVE'||u.deleted_at)return badToken();
   const [rows]=await c.execute("SELECT *,reset_expires_at>UTC_TIMESTAMP(3) AS is_live FROM auth_challenges WHERE user_id=? AND reset_token_hash=? AND purpose='RESET_PASSWORD' FOR UPDATE",[u.id,hashed]);const ch=rows[0];
   if(!ch||!ch.verified_at||ch.consumed_at||!Number(ch.is_live))return badToken();
   await c.execute('UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?',[newHash,u.id]);
   await invalidate(c,u.id);return null;
  });
 }
 async function login(email,password){
  // Expensive bcrypt runs outside a row lock. Row is rechecked before issuing token.
  const [rows]=await db.execute('SELECT * FROM users WHERE email=?',[email]);const candidate=rows[0];
  const hash=candidate?candidate.password_hash:await bcrypt.hash('dummy-login-value',cfg().bcryptRounds);
  if(!await bcrypt.compare(password,hash)||!candidate)throw error('INVALID_CREDENTIALS',401,'Email hoặc mật khẩu không đúng.','Incorrect email or password.');
  return tx(async c=>{
   const u=await byEmail(c,email);
   if(!u||u.password_hash!==hash||u.deleted_at||u.status==='LOCKED'||u.status==='DELETED')return unauthorized();
   if(u.status==='PENDING')return error('EMAIL_NOT_VERIFIED',403,'Bạn cần xác minh email trước khi đăng nhập.','Verify your email before signing in.');
   if(u.status!=='ACTIVE')return unauthorized();
   const [roles]=await c.execute('SELECT code FROM roles WHERE id=?',[u.role_id]);u.role_code=roles[0]?.code;
   const settings=cfg();const token=jwt.sign({ver:Number(u.token_version)},settings.secret,{algorithm:'HS256',subject:String(u.id),issuer:settings.issuer,audience:settings.audience,expiresIn:settings.expiresIn});
   await c.execute('UPDATE users SET last_login_at=UTC_TIMESTAMP(3) WHERE id=?',[u.id]);
   return {accessToken:token,tokenType:'Bearer',expiresIn:settings.expiresIn,user:safeUser(u)};
  });
 }
 async function authenticate(token){
  let payload;const s=cfg();
  try{payload=jwt.verify(token,s.secret,{algorithms:['HS256'],issuer:s.issuer,audience:s.audience});}
  catch{throw unauthorized();}
  if(!payload||typeof payload.sub!=='string'||!/^\d+$/.test(payload.sub)||!Number.isInteger(payload.ver))throw unauthorized();
  const [rows]=await db.execute('SELECT u.*,r.code AS role_code FROM users u JOIN roles r ON r.id=u.role_id WHERE u.id=?',[payload.sub]);const u=rows[0];
  if(!u||u.status!=='ACTIVE'||u.deleted_at||Number(u.token_version)!==payload.ver)throw unauthorized();
  return {user:safeUser(u),id:String(u.id),version:payload.ver};
 }
 async function changePassword(auth,currentPassword,newPassword){
  const nextHash=await bcrypt.hash(newPassword,cfg().bcryptRounds);
  return tx(async c=>{
   const [rows]=await c.execute('SELECT * FROM users WHERE id=? FOR UPDATE',[auth.id]);const u=rows[0];
   if(!u||u.status!=='ACTIVE'||u.deleted_at||Number(u.token_version)!==auth.version)return unauthorized();
   if(!await bcrypt.compare(currentPassword,u.password_hash))return error('INVALID_CURRENT_PASSWORD',400,'Mật khẩu hiện tại không đúng.','Current password is incorrect.');
   await c.execute('UPDATE users SET password_hash=?,token_version=token_version+1 WHERE id=?',[nextHash,u.id]);
   await invalidate(c,u.id);return null;
  });
 }
 async function logout(auth){return tx(async c=>{
  const [rows]=await c.execute('SELECT * FROM users WHERE id=? FOR UPDATE',[auth.id]);const u=rows[0];
  if(!u||u.status!=='ACTIVE'||u.deleted_at||Number(u.token_version)!==auth.version)return unauthorized();
  await c.execute('UPDATE users SET token_version=token_version+1 WHERE id=?',[auth.id]);return null;
 });}
 return {register,requestCode,verify,reset,login,authenticate,changePassword,logout};
}
let instance;
function getService(){if(!instance)instance=createService({db:require('../configs/database.config'),bcrypt:require('bcryptjs'),jwt:require('jsonwebtoken'),mail:require('../utils/mail.util'),config:require('../configs/auth.config')});return instance;}
module.exports={createService,getService};
