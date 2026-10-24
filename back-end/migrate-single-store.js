const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const dns = require('node:dns');
require('dotenv').config({ path: path.join(__dirname, '.env') });
dns.setServers(['8.8.8.8', '8.8.4.4']);
const { getPlan, getBackup, migrate } = require('./src/services/storeMigration.services');

(async () => {
    await mongoose.connect(process.env.MONGODB_URL, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
    const plan = await getPlan();
    console.log('Dữ liệu cần chuyển:', plan);
    if (!plan.needs_migration) return console.log('Dữ liệu đã dùng một cửa hàng, không cần chuyển thêm.');
    if (!process.argv.includes('--apply')) {
        return console.log('Chỉ xem trước. Dừng backend, chạy lại với --apply để sao lưu và chuyển dữ liệu.');
    }

    const directory = path.join(__dirname, 'backups');
    fs.mkdirSync(directory, { recursive: true });
    const filename = path.join(directory, 'single-store-' + Date.now() + '.json');
    fs.writeFileSync(filename, mongoose.mongo.BSON.EJSON.stringify(await getBackup(), null, 2), { flag: 'wx' });
    console.log('Đã sao lưu dữ liệu gốc:', filename);
    console.log('Kết quả chuyển dữ liệu:', await migrate());
})()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
