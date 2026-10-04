const mysql = require('mysql2/promise');
let pool;
function getPool() {
  if (!pool) {
    for (const key of ['DB_HOST','DB_USER','DB_NAME']) {
      if (!process.env[key]) { const error=new Error('Missing database configuration'); error.code='DB_CONFIG_MISSING'; throw error; }
    }
    pool = mysql.createPool({
      host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER, password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME,
      waitForConnections: true, connectionLimit: 10, queueLimit: 100,
      connectTimeout: 5000, charset: 'utf8mb4', timezone: 'Z',
      supportBigNumbers: true, bigNumberStrings: true, decimalNumbers: false, dateStrings: true
    });
  }
  return pool;
}
// All services use this wrapper so each acquired session is UTC.
async function getConnection() {
  const connection=await getPool().getConnection();
  try { await connection.query("SET time_zone = '+00:00'"); return connection; }
  catch(error) { connection.release(); throw error; }
}
async function run(method,sql,values) {
  const connection=await getConnection();
  try { return await connection[method](sql,values); }
  finally { connection.release(); }
}
module.exports={
  getConnection,
  query:(sql,values)=>run('query',sql,values),
  execute:(sql,values)=>run('execute',sql,values),
  end:async()=>{if(pool){await pool.end();pool=undefined;}}
};
