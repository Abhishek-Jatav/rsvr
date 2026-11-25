'use strict';
const Passkey = require('./passkey.model');

module.exports = {
  create: (data) => Passkey.create(data),
  findByUser: (userId) => Passkey.find({ userId }),
  countByUser: (userId) => Passkey.countDocuments({ userId }),
  findByCredentialId: (credentialId) => Passkey.findOne({ credentialId }),
  updateUsage: (id, counter, now) => Passkey.updateOne({ _id: id }, { $set: { counter, lastUsedAt: now } }),
};
