'use strict';
const { config } = require('./config');
const { connectDatabase, ensureIndexes } = require('./config/db');
const { createApp } = require('./app');
const logger = require('./shared/logger');

const models = [
  require('./modules/users/user.model'),
  require('./modules/challenges/challenge.model'),
  require('./modules/sessions/session.model'),
  require('./modules/webauthn/passkey.model'),
];

async function main() {
  await connectDatabase();
  await ensureIndexes(models);
  const app = createApp();
  app.listen(config.port, () => logger.info('server listening', { port: config.port, env: config.env }));
}

main().catch((err) => {
  logger.error('startup failed', { name: err && err.name, message: err && err.message });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled rejection', { name: reason && reason.name });
});
