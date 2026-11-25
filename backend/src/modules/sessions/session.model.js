'use strict';
const mongoose = require('mongoose');
const { AUTH_METHOD } = require('../../shared/constants');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    authenticationMethod: { type: String, enum: Object.values(AUTH_METHOD), required: true },
    isActive: { type: Boolean, default: true }, // flipped to false on revoke/expiry cleanup
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'Sessions' }
);

sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });
// One active session per user, enforced by the database itself (race-safe).
sessionSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // cleanup only

module.exports = mongoose.model('Session', sessionSchema);
