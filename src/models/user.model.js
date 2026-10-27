const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: 'password_hash'
    },
    googleId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
        field: 'google_id'
    },
    emailVerified: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'email_verified'
    },
    roles: {
        type: DataTypes.ENUM('ADMIN', 'CLIENT'),
        allowNull: false,
        defaultValue: 'CLIENT'
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'DISABLED'),
        allowNull: false,
        defaultValue: 'ACTIVE'
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'last_login_at'
    },
    passwordResetTokenHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        field: 'password_reset_token_hash'
    },
    passwordResetExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'password_reset_expires_at'
    },
    createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'created_at'
    },
    updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updated_at'
    }
},
{
    tableName: 'users',
    timestamps: true
});

module.exports = User;