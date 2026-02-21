const nodemailer = require('nodemailer');
function transporter() {
  const transportType = (process.env.EMAIL_TRANSPORT || '').toLowerCase();
  if (transportType === 'json') {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (process.env.SMTP_SECURE || 'false') === 'true';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!host || !user || !pass) {
    return nodemailer.createTransport({ jsonTransport: true });
  }
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}
async function sendMail(to, subject, text) {
  const from = process.env.EMAIL_FROM || 'no-reply@example.com';
  const t = transporter();
  return t.sendMail({ from, to, subject, text });
}
async function sendVerificationEmail(to, code) {
  const subject = 'Verify your email';
  const text = 'Your verification code is ' + code;
  return sendMail(to, subject, text);
}
async function sendPasswordResetEmail(to, code) {
  const subject = 'Reset your password';
  const text = 'Your password reset code is ' + code;
  return sendMail(to, subject, text);
}
async function sendDriverCredentialsEmail(to, email, password) {
  const subject = 'Your driver account credentials';
  const text =
    'Your driver account has been created.\n\n' +
    'Email: ' + email + '\n' +
    'Password: ' + password + '\n\n' +
    'Please keep these credentials secure. It is recommended to change your password after your first login.';
  return sendMail(to, subject, text);
}
module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendDriverCredentialsEmail, sendMail };
