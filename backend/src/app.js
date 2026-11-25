'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

const { config } = require('./config');
const { MAX_BODY_SIZE } = require('./shared/constants');
const originGuard = require('./shared/middleware/originGuard');
const { notFound, errorHandler } = require('./shared/middleware/errorHandler');
const authRoutes = require('./modules/auth/auth.routes');
const webauthnRoutes = require('./modules/webauthn/webauthn.routes');

function createApp() {
  const app = express();
  if (config.isProd) app.set('trust proxy', 1); // Render terminates TLS in front of the app

  app.use(helmet());
  app.use(cors({ origin: config.frontendOrigin, credentials: true })); // exact origin, never "*"
  app.use(express.json({ limit: MAX_BODY_SIZE }));
  app.use(cookieParser());
  app.use(originGuard);

  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      data: { status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' },
      message: 'Service is running',
    });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/webauthn', webauthnRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
