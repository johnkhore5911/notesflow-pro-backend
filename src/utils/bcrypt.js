const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error('Error hashing password: ' + error.message);
  }
};

/**
 * Compare plain text password with hashed password
 * @param {string} plainPassword - Plain text password
 * @param {string} hashedPassword - Hashed password from database
 * @returns {Promise<boolean>} - Match result
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing password: ' + error.message);
  }
};

/**
 * Generate a random salt
 * @param {number} rounds - Salt rounds (default: 12)
 * @returns {Promise<string>} - Generated salt
 */
const generateSalt = async (rounds = SALT_ROUNDS) => {
  try {
    return await bcrypt.genSalt(rounds);
  } catch (error) {
    throw new Error('Error generating salt: ' + error.message);
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  generateSalt,
  SALT_ROUNDS
};
