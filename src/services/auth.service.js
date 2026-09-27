const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  User
} = require('../models');

class AuthService {

  async register({
    name,
    email,
    password
  }) {

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const existingUser =
      await User.findOne({
        where: {
          email: normalizedEmail
        }
      });

    if (existingUser) {

      const error =
        new Error(
          'Ya existe un usuario con este correo.'
        );

      error.statusCode = 409;

      throw error;
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * MUY IMPORTANTE:
     *
     * Nunca aceptamos roles desde
     * el endpoint público de registro.
     *
     * Todo usuario registrado públicamente
     * nace como CLIENT.
     */

    const user =
      await User.create({

        name:
          name.trim(),

        email:
          normalizedEmail,

        passwordHash,

        roles:
          'CLIENT',

        status:
          'ACTIVE'

      });

    const token =
      this.generateToken(user);

    return {

      user:
        this.toSafeUser(user),

      token

    };
  }


  async login({
    email,
    password
  }) {

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const user =
      await User.findOne({
        where: {
          email: normalizedEmail
        }
      });

    if (!user) {

      const error =
        new Error(
          'Correo o contraseña incorrectos.'
        );

      error.statusCode = 401;

      throw error;
    }

    if (
      user.status !== 'ACTIVE'
    ) {

      const error =
        new Error(
          'El usuario se encuentra deshabilitado.'
        );

      error.statusCode = 403;

      throw error;
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.passwordHash
      );

    if (!validPassword) {

      const error =
        new Error(
          'Correo o contraseña incorrectos.'
        );

      error.statusCode = 401;

      throw error;
    }

    user.lastLoginAt =
      new Date();

    await user.save();

    const token =
      this.generateToken(user);

    return {

      user:
        this.toSafeUser(user),

      token

    };
  }


  async getMe(userId) {

    const user =
      await User.findByPk(
        userId
      );

    if (!user) {

      const error =
        new Error(
          'Usuario no encontrado.'
        );

      error.statusCode = 404;

      throw error;
    }

    return this.toSafeUser(
      user
    );
  }


  generateToken(user) {

    return jwt.sign(

      {
        sub:
          user.id

      },

      process.env.JWT_SECRET,

      {
        expiresIn:
          process.env.JWT_EXPIRES_IN ||
          '7d'
      }

    );
  }


  toSafeUser(user) {

    return {

      id:
        user.id,

      name:
        user.name,

      email:
        user.email,

      roles:
        user.roles,

      status:
        user.status,

      lastLoginAt:
        user.lastLoginAt,

      createdAt:
        user.createdAt

    };
  }

}

module.exports =
  new AuthService();