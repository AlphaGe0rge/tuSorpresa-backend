const User = require('./user.model');
const Surprise = require('./surprise.model');
const Payment = require('./payment.model');


/*
|--------------------------------------------------------------------------
| USER → SURPRISE
|--------------------------------------------------------------------------
*/

User.hasMany(Surprise, {
    foreignKey: 'userId',
    as: 'surprises',
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
});

Surprise.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
});


/*
|--------------------------------------------------------------------------
| SURPRISE → PAYMENT
|--------------------------------------------------------------------------
*/

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