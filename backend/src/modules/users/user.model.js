'use strict';
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    surname: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true }, // E.164; omitted (never null/empty) when not supplied
    dob: { type: Date, required: true }, // UTC midnight = date-only convention
  },
  { timestamps: true, collection: 'Users' }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $type: 'string' } } });
userSchema.index({ createdAt: 1 });

module.exports = mongoose.model('User', userSchema);
