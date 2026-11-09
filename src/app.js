
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const sequelize = require('./config/database');
require('./models');

const surpriseRoutes = require('./routes/surprise.routes');
const paymentRoutes = require('./routes/payment.routes');
const authRoutes = require('./routes/auth.routes');
const contactRoutes = require('./routes/contact.routes');

const app = express();

const PORT = process.env.PORT || 8081;

const allowedOrigins = [
    'http://localhost:4200',
    'https://tusorpresadigital.com',
    'https://www.tusorpresadigital.com',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        console.error(`CORS blocked origin: ${origin}`);
        console.error('Allowed origins:', allowedOrigins);

        return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/api/surprises', surpriseRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/contact', contactRoutes);

// Start server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');

        await sequelize.sync();
        console.log('Database synchronized successfully');

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start server:', error.message);
        process.exit(1);
    }
};

startServer();
