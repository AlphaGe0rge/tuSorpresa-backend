const User = require('./user.model');
const Surprise = require('./surprise.model');
const Payment = require('./payment.model');


/*
|--------------------------------------------------------------------------
| USER → SURPRISE
|--------------------------------------------------------------------------
|
| Un usuario puede tener muchas sorpresas.
|
| userId puede ser NULL porque una sorpresa también
| puede ser creada por un usuario invitado.
|
| Si posteriormente se elimina el usuario,
| NO eliminamos sus sorpresas.
|
*/

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


/*
|--------------------------------------------------------------------------
| SURPRISE → PAYMENT
|--------------------------------------------------------------------------
|
| Una sorpresa puede tener uno o varios registros
| de pago asociados.
|
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


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
    User,
    Surprise,
    Payment
};