'use strict';
const Session = require('./session.model');

module.exports = {
  insert: (data) => Session.create(data),

  findActiveByTokenHash: (tokenHash, now) =>
    Session.findOne({ tokenHash, isActive: true, revokedAt: null, expiresAt: { $gt: now } }),

  findActiveByUser: (userId, now) =>
    Session.findOne({ userId, isActive: true, revokedAt: null, expiresAt: { $gt: now } }),

  /** Expired-but-flagged-active sessions must be closed or the unique index would block new logins. */
  closeExpiredForUser: (userId, now) =>
    Session.updateMany(
      { userId, isActive: true, expiresAt: { $lte: now } },
      { $set: { isActive: false, revokedAt: now } }
    ),

  revoke: (id, now) =>
    Session.updateOne({ _id: id, isActive: true }, { $set: { isActive: false, revokedAt: now } }),

  touch: (id, now) => Session.updateOne({ _id: id }, { $set: { lastSeenAt: now } }),
};
