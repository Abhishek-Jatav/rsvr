'use strict';
/**
 * Email delivery behind a small boundary so Gmail can be swapped for another
 * provider without touching authentication logic. Never logs the code.
 */
const nodemailer = require('nodemailer');
const { config } = require('../../config');

let transporter;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transporter;
};

async function sendOtpEmail(to, code, ttlSeconds) {
  const minutes = Math.round(ttlSeconds / 60);
  await getTransporter().sendMail({
    from: config.email.from,
    to,
    subject: 'Your RSVR sign-in code',
    text:
      `Your RSVR verification code is ${code}.\n\n` +
      `It expires in ${minutes} minutes and can be used once. ` +
      `If you did not request it, you can ignore this email.`,
    html:
      `<p>Your RSVR verification code is:</p>` +
      `<p style="font-size:28px;letter-spacing:6px;font-weight:bold">${code}</p>` +
      `<p>It expires in ${minutes} minutes and can be used once. If you did not request it, you can ignore this email.</p>`,
  });
}

module.exports = { sendOtpEmail };
