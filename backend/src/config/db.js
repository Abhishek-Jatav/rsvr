'use strict';
const mongoose = require('mongoose');
const { config } = require('./index');
const logger = require('../shared/logger');

async function connectDatabase() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 10000 });
  logger.info('database connected');
}

/** Build and verify every declared index (unique + partial indexes are security-relevant). */
async function ensureIndexes(models) {
  await Promise.all(models.map((m) => m.init()));
  logger.info('database indexes ready');
}

module.exports = { connectDatabase, ensureIndexes };
