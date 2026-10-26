
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

const allowedOrigins = ['http://localhost:4200', process.env.FRONTEND_URL].filter(Boolean);

// Middlewares
app.use(cors({
    origin: (origin, callback) => {
        // Permitir solicitudes sin Origin, como algunas llamadas de servidor
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origen no permitido por CORS'));
    }
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok'
    });
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
