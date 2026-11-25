'use strict';
const userRepository = require('./user.repository');
const { AppError, isDuplicateKeyError } = require('../../shared/errors');
const { toDateOnlyString } = require('../../shared/validation');

/** Only the fields the dashboard needs (docs/database.md section 2). */
function toPublicUser(user) {
  const out = { surname: user.surname, email: user.email };
  if (user.phone) out.phone = user.phone;
  out.dob = toDateOnlyString(user.dob);
  return out;
}

async function register({ email, phone, dob, surname }) {
  const data = { email, dob, surname };
  if (phone) data.phone = phone;
  try {
    const user = await userRepository.create(data);
    return { userId: String(user._id) };
  } catch (err) {
    // Uniqueness is enforced by DB indexes so concurrent duplicate requests cannot both win.
    if (isDuplicateKeyError(err)) {
      throw new AppError(409, 'ACCOUNT_ALREADY_EXISTS', 'An account with these details already exists.');
    }
    throw err;
  }
}

module.exports = { register, toPublicUser };
