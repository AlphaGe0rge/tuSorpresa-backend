const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LegalConsent = sequelize.define('LegalConsent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    surpriseId: {
        type: DataTypes.UUID,
        allowNull: false,
        field: 'surprise_id'
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true,
        field: 'user_id'
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    termsAccepted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'terms_accepted'
    },
    privacyAuthorized: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'privacy_authorized'
    },
    contentRightsConfirmed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: 'content_rights_confirmed'
    },
    termsVersion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'terms_version'
    },
    privacyVersion: {
        type: DataTypes.STRING(20),
        allowNull: false,
        field: 'privacy_version'
    },
    ipAddress: {
        type: DataTypes.STRING(45),
        allowNull: true,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'user_agent'
    }
}, {
    tableName: 'legal_consents',
    timestamps: true,
    createdAt: 'accepted_at',
    updatedAt: false
});

module.exports = LegalConsent;