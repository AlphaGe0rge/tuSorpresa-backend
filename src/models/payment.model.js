
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false
    },
    surpriseId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'surprise_id'
    },
    attemptNumber: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
        field: 'attempt_number'
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
        unique: true,
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
            'CREATED',
            'PENDING',
            'APPROVED',
            'DECLINED',
            'VOIDED',
            'ERROR'
        ),
        allowNull: false,
        defaultValue: 'CREATED'
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
    failureReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'failure_reason'
    },
    paidAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'paid_at'
    },
    plan: {
        type: DataTypes.ENUM('30-days', 'permanent'),
        allowNull: false
    },
    durationDays: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: true,
        field: 'duration_days',
        validate: {
            min: 1
        }
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
}, {
    tableName: 'payments',
    timestamps: true,
    indexes: [
        {
            fields: ['surprise_id', 'created_at']
        },
        {
            fields: ['status', 'created_at']
        }
    ]
});

module.exports = Payment;
