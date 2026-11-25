'use strict';
/**
 * The "OTPs" collection. Holds email-OTP records AND short-lived WebAuthn
 * ceremony challenges, told apart by `purpose` (docs/database.md section 3).
 */
const mongoose = require('mongoose');
const { PURPOSE, CHALLENGE_RETENTION_SECONDS } = require('../../shared/constants');

const challengeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    identifier: { type: String, required: true }, // normalised email
    purpose: { type: String, enum: Object.values(PURPOSE), required: true },
    codeHash: { type: String }, // email OTP only; never plaintext
    challenge: { type: String }, // WebAuthn only
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'OTPs' }
);

// Cleanup only. Application code always checks expiresAt itself.
challengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: CHALLENGE_RETENTION_SECONDS });
challengeSchema.index({ identifier: 1, purpose: 1, createdAt: -1 });
challengeSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

module.exports = mongoose.model('Challenge', challengeSchema);
