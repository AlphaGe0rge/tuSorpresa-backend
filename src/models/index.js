const User = require('./user.model');
const Surprise = require('./surprise.model');
const Payment = require('./payment.model');

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
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Payment.belongsTo(Surprise, {
    foreignKey: 'surpriseId',
    as: 'surprise'
});

module.exports = {
    User,
    Surprise,
    Payment
};