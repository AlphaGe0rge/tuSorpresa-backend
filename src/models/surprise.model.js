const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Surprise = sequelize.define(
    'Surprise',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },

        /*
        |--------------------------------------------------------------------------
        | OWNER
        |--------------------------------------------------------------------------
        |
        | Puede ser NULL porque una sorpresa puede ser creada
        | por un usuario invitado.
        |
        */

        userId: {
            type: DataTypes.UUID,
            allowNull: true,
            field: 'user_id'
        },

        /*
        |--------------------------------------------------------------------------
        | TEMPLATE
        |--------------------------------------------------------------------------
        */

        template: {
            type: DataTypes.STRING(100),
            allowNull: false
        },

        /*
        |--------------------------------------------------------------------------
        | TOKENS
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | CONTENT
        |--------------------------------------------------------------------------
        */

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

        /*
        |--------------------------------------------------------------------------
        | CONTACT
        |--------------------------------------------------------------------------
        |
        | Este es el correo utilizado para enviar al creador
        | la información relacionada con su sorpresa.
        |
        | También nos permite posteriormente encontrar
        | sorpresas creadas como invitado cuando el usuario
        | verifica su cuenta.
        |
        */

        email: {
            type: DataTypes.STRING(255),
            allowNull: false
        },

        /*
        |--------------------------------------------------------------------------
        | MEDIA
        |--------------------------------------------------------------------------
        */

        photos: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: []
        },

        /*
        |--------------------------------------------------------------------------
        | TEMPLATE DYNAMIC DATA
        |--------------------------------------------------------------------------
        */

        dynamicData: {
            type: DataTypes.JSON,
            allowNull: false,
            defaultValue: {}
        },

        /*
        |--------------------------------------------------------------------------
        | STATUS
        |--------------------------------------------------------------------------
        */

        status: {
            type: DataTypes.ENUM(
                'PENDING_PAYMENT',
                'ACTIVE',
                'EXPIRED',
                'DISABLED'
            ),
            allowNull: false,
            defaultValue: 'PENDING_PAYMENT'
        },

        /*
        |--------------------------------------------------------------------------
        | DATES
        |--------------------------------------------------------------------------
        */

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