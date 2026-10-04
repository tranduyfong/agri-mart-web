const db = require('../configs/database.config');

exports.checkDatabase = async() => {
    await db.query('SELECT 1 AS ok');

    return {
        database: 'connected'
    };
};
