require('dotenv').config();

const express = require('express');
const cors = require('cors');

const sequelize = require('../src/config/database');
require('../src/models');

const surpriseRoutes = require('../src/routes/surprise.routes');

const app = express();

const PORT = process.env.PORT || 3000;


// Middlewares
app.use(cors({
    origin: 'http://localhost:4200'
}));

app.use(express.json());


// Routes
app.use('/api/surprises', surpriseRoutes);


// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok'
    });
});


// Start server
const startServer = async () => {

    try {

        await sequelize.authenticate();

        console.log('Database connected successfully');

        await sequelize.sync();

        console.log('Database synchronized successfully');

        app.listen(
            PORT,
            () => {

                console.log(
                    `Server running on http://localhost:${PORT}`
                );

            }
        );

    } catch (error) {

        console.error(
            'Unable to start server:',
            error
        );

        process.exit(1);
    }
};


startServer();