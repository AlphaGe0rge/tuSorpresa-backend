const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Surprise = sequelize.define(
    'Surprise',
    {
        id: {
            type: DataTypes.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },

        template: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        publicToken: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
            field: 'public_token'
        },

        editTokenHash: {
            type: DataTypes.STRING(128),
            allowNull: false,
            field: 'edit_token_hash'
        },

        recipientName: {
            type: DataTypes.STRING(100),
            allowNull: false,
            field: 'recipient_name'
        },

        senderName: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'sender_name'
        },

        title: {
            type: DataTypes.STRING(150),
            allowNull: true
        },

        message: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        photos: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        },
        status: {
            type: DataTypes.ENUM(
                'ACTIVE',
                'EXPIRED',
                'DISABLED'
            ),
            allowNull: false,
            defaultValue: 'ACTIVE'
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
        },

        expiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'expires_at'
        }
    },
    {
        tableName: 'surprises',
        timestamps: true
    }
);

module.exports = Surprise;