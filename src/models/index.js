const User = require('./user.model');
const Surprise = require('./surprise.model');
const Payment = require('./payment.model');
const LegalConsent = require('./legal-consent.model');

User.hasMany(Surprise, {
    foreignKey: 'userId',
    as: 'surprises',
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
});

Surprise.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});

Surprise.hasMany(Payment, {
    foreignKey: 'surpriseId',
    as: 'payments',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

Payment.belongsTo(Surprise, {
    foreignKey: 'surpriseId',
    as: 'surprise',
    onDelete: 'RESTRICT',
    onUpdate: 'CASCADE'
});

module.exports = {
    User,
    Surprise,
    Payment
};