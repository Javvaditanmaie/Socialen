// utils/sanitizeUser.js

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.totpSecret;
  return obj;
}

module.exports = sanitizeUser;
