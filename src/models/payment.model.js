const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define(
    'Payment',
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false
        },

        surpriseId: {
            type: DataTypes.BIGINT.UNSIGNED,
            allowNull: false,
            field: 'surprise_id'
        },

        provider: {
            type: DataTypes.ENUM('WOMPI'),
            allowNull: false,
            defaultValue: 'WOMPI'
        },

        reference: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },

        wompiTransactionId: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'wompi_transaction_id'
        },

        amountInCents: {
            type: DataTypes.INTEGER.UNSIGNED,
            allowNull: false,
            field: 'amount_in_cents'
        },

        currency: {
            type: DataTypes.STRING(3),
            allowNull: false,
            defaultValue: 'COP'
        },

        status: {
            type: DataTypes.ENUM(
                'PENDING',
                'APPROVED',
                'DECLINED',
                'VOIDED',
                'ERROR'
            ),
            allowNull: false,
            defaultValue: 'PENDING'
        },

        paymentMethodType: {
            type: DataTypes.STRING(100),
            allowNull: true,
            field: 'payment_method_type'
        },

        statusMessage: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'status_message'
        },

        paidAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'paid_at'
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
        tableName: 'payments',
        timestamps: true
    }
);

module.exports = Payment;