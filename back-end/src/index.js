require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rootRoutes = require('./routes/index');
const app = express();
const PORT = process.env.PORT || 8000;

// Middlewares cơ bản
app.use(cors());
app.use(express.json()); // Để parse body dạng JSON
app.use(express.urlencoded({ extended: true }));

// Kết nối các Routes
app.use('/api', rootRoutes);

// Xử lý Route Not Found (404) theo đúng chuẩn Response
app.use((req, res, next) => {
    const { errorResponse } = require('./utils/response.util');
    return errorResponse(res, 'RESOURCE_NOT_FOUND', 'Endpoint not found', 404);
});

app.listen(PORT, () => {
    console.log(`Server app listening on port ${PORT}`);
});