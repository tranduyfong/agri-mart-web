require('dotenv').config({
    quiet: true
});

const express = require('express');

const cors = require('cors');

const http = require('node:http');

const db = require('./configs/database.config');

const requestMiddleware = require('./middlewares/request.middleware');

const errorMiddleware = require('./middlewares/error.middleware');

const {
    errorResponse
} = require('./utils/response.util');

const app = express();

app.disable('x-powered-by');

app.use(requestMiddleware);

const origins = (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(s => s.trim()).filter(
    Boolean
);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origins.includes(origin)) {
            return callback(null, true);
        }

        const error = new Error('Origin denied');

        error.code = 'CORS_DENIED';

        return callback(error);
    },
    exposedHeaders: ['X-Request-Id']
}));

app.use(express.json({
    limit: '1mb'
}));

app.use(express.urlencoded({
    extended: true,
    limit: '1mb'
}));

app.use('/api', require('./routes'));

app.use(
    (req, res) => errorResponse(res, 'RESOURCE_NOT_FOUND', req.locale === 'en' ? 'Endpoint not found.' : 'Không tìm thấy API.', 404)
);

app.use(errorMiddleware);

const server = http.createServer(app);

if (require.main === module) {
    require('./configs/auth.config')();

    const port = Number(process.env.PORT || 8000),
    host = process.env.HOST || '127.0.0.1';

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('Invalid PORT');
    }

    server.on('error', error => {
        console.error('Server startup failed:', error.code || 'SERVER_ERROR');

        process.exitCode = 1;
    });

    server.listen(port, host, () => console.log(`Backend: http://${host}:${port}/api/health`));

    let closing = false;

    const shutdown = () => {
        if (closing) {
            return;
        }

        closing = true;

        const timer = setTimeout(() => process.exit(1), 10000);

        timer.unref();

        server.close(async() => {
            try {
                await db.end();

                clearTimeout(timer);
            } catch {
                process.exitCode = 1;
            }
        });
    };

    process.on('SIGINT', shutdown);

    process.on('SIGTERM', shutdown);
}

module.exports = {
    app,
    server
};
