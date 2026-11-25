'use strict';
const Challenge = require('./challenge.model');

module.exports = {
  create: (data) => Challenge.create(data),
  deleteById: (id) => Challenge.deleteOne({ _id: id }),

  latest: (filter) => Challenge.findOne(filter).sort({ createdAt: -1 }),

  countCreatedSince: (filter, since) => Challenge.countDocuments({ ...filter, createdAt: { $gte: since } }),

  /** Mark every still-open challenge matching the filter as consumed (supersede). */
  supersede: (filter, now) => Challenge.updateMany({ ...filter, consumedAt: null }, { $set: { consumedAt: now } }),

  /** Atomically add one failed/used attempt; null when the record is closed or out of attempts. */
  incrementAttempts: (id, now) =>
    Challenge.findOneAndUpdate(
      { _id: id, consumedAt: null, expiresAt: { $gt: now }, $expr: { $lt: ['$attempts', '$maxAttempts'] } },
      { $inc: { attempts: 1 } },
      { new: true }
    ),

  /** Atomically consume one specific open challenge (single use). */
  consumeById: (id, now) =>
    Challenge.findOneAndUpdate(
      { _id: id, consumedAt: null, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
      { new: true }
    ),

  /** Atomically consume the newest open challenge matching the filter. */
  consumeLatestOpen: (filter, now) =>
    Challenge.findOneAndUpdate(
      { ...filter, consumedAt: null, expiresAt: { $gt: now } },
      { $set: { consumedAt: now } },
      { new: true, sort: { createdAt: -1 } }
    ),

  /** True when an unconsumed but already-expired challenge exists (to report "expired"). */
  hasExpiredOpen: async (filter, now) =>
    Boolean(await Challenge.exists({ ...filter, consumedAt: null, expiresAt: { $lte: now } })),
};
