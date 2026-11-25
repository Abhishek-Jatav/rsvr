'use strict';
const mongoose = require('mongoose');

const passkeySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    credentialId: { type: String, required: true }, // base64url
    publicKey: { type: Buffer, required: true }, // public key only, never a private key or biometric
    counter: { type: Number, default: 0 },
    transports: { type: [String], default: [] },
    lastUsedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: 'Passkeys' }
);

passkeySchema.index({ credentialId: 1 }, { unique: true });
passkeySchema.index({ userId: 1 });

module.exports = mongoose.model('Passkey', passkeySchema);
