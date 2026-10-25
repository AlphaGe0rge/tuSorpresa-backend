require('dotenv').config();

const bcrypt = require('bcryptjs');

const { User } = require('../models');

async function createAdmin() {

    try {

        const name = process.env.ADMIN_NAME;
        const email = process.env.ADMIN_EMAIL.trim().toLowerCase();

        const password = process.env.ADMIN_PASSWORD;

        const existing = await User.findOne({
            where: {
                email
            }
        });

        if (existing) {
            console.log('Ya existe un usuario con ese correo.');
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await User.create({
            name,
            email,
            passwordHash,
            roles: 'ADMIN',
            status: 'ACTIVE'
        });

        console.log('Administrador creado correctamente.');
        console.log('UUID:', user.id);

        process.exit(0);

    } catch (error) {
        console.error('Error creando administrador:', error);
        process.exit(1);
    }

}

createAdmin();