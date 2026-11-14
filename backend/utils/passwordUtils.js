
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

// Convert a plain-text password into a secure hash
const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

// Compare login password with the stored hash
const comparePassword = async (password, passwordHash) => {
  return await bcrypt.compare(password, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
};
