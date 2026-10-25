
const { Sequelize } = require('sequelize');

const database = process.env.DB_NAME || process.env.MYSQLDATABASE;
const username = process.env.DB_USER || process.env.MYSQLUSER;
const password = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD;
const host = process.env.DB_HOST || process.env.MYSQLHOST;
const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);

if (!database || !username || !password || !host) {
    throw new Error('Faltan variables de configuración para MySQL');
}

const sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'mysql',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
    retry: {
        max: 3
    }
});

module.exports = sequelize;
