const Surprise = require('./surprise.model');
const User = require('./user.model');

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

module.exports = {
  User,
  Surprise
};