const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const generateCode = require('../utils/generateCode');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/mailer');
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}
function shouldIncludeDevCode() {
  const debug = (process.env.EMAIL_DEBUG_CODES || 'false') === 'true';
  const transport = (process.env.EMAIL_TRANSPORT || '').toLowerCase();
  const host = process.env.SMTP_HOST || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const missingSmtp = !host || !user || !pass;
  return debug || transport === 'json' || missingSmtp;
}
async function signup(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '').trim();
    const firstName = String(req.body.firstName || '').trim();
    const lastName = String(req.body.lastName || '').trim();
    const phoneNo = String(req.body.phoneNo || '').trim();
    if (!firstName || !lastName || !phoneNo || !email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'weak_password' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'email_in_use' });
    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const hashedCode = await bcrypt.hash(code, 12);
    const now = Date.now();
    const user = await User.create({
      email,
      firstName,
      lastName,
      phoneNo,
      passwordHash,
      verified: false,
      emailVerificationCode: hashedCode,
      emailVerificationExpires: new Date(now + CODE_TTL_MS),
      lastEmailCodeSentAt: new Date(now)
    });
    try {
      await sendVerificationEmail(user.email, code);
    } catch (sendErr) {
      try {
        await User.deleteOne({ _id: user._id });
      } catch (_) { }
      return res.status(500).json({ error: 'email_send_failed' });
    }
    const response = { message: `signup successfull, please verify your email ${user.email}` };
    if (shouldIncludeDevCode()) response.code = code;
    return res.status(201).json(response);
  } catch (e) {
    return res.status(500).json({ error: 'signup_failed' });
  }
}
async function verifyEmail(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '');
    if (!email || !code) return res.status(400).json({ error: 'missing_fields' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'not_found' });
    if (!user.emailVerificationCode || !user.emailVerificationExpires) return res.status(400).json({ error: 'no_pending_verification' });
    if (user.emailVerificationExpires.getTime() < Date.now()) return res.status(400).json({ error: 'code_expired' });
    const ok = await bcrypt.compare(code, user.emailVerificationCode);
    if (!ok) return res.status(400).json({ error: 'invalid_code' });
    user.verified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    return res.json({ message: 'email_verified' });
  } catch (e) {
    return res.status(500).json({ error: 'verify_failed' });
  }
}
async function resendCode(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'missing_email' });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'not_found' });
    if (user.verified) return res.status(400).json({ error: 'already_verified' });
    const now = Date.now();
    if (user.lastEmailCodeSentAt && now - user.lastEmailCodeSentAt.getTime() < RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: 'resend_too_soon' });
    }
    const code = generateCode();
    const hashedCode = await bcrypt.hash(code, 12);
    user.emailVerificationCode = hashedCode;
    user.emailVerificationExpires = new Date(now + CODE_TTL_MS);
    user.lastEmailCodeSentAt = new Date(now);
    await user.save();
    await sendVerificationEmail(user.email, code);
    const response = { message: 'code_resent' };
    if (shouldIncludeDevCode()) response.code = code;
    return res.json(response);
  } catch (e) {
    return res.status(500).json({ error: 'resend_failed' });
  }
}
async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'missing_fields' });
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    if (!user.verified) return res.status(403).json({ error: 'email_not_verified' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });
    const token = jwt.sign({}, process.env.JWT_SECRET || '', { subject: String(user._id), expiresIn: process.env.JWT_EXPIRES || '7d' });
    return res.json({ token });
  } catch (e) {
    return res.status(500).json({ error: 'login_failed' });
  }
}
async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: 'missing_email' });
    const user = await User.findOne({ email });
    const code = generateCode();
    const now = Date.now();
    const hashedCode = await bcrypt.hash(code, 12);
    if (user) {
      user.passwordResetCode = hashedCode;
      user.passwordResetExpires = new Date(now + CODE_TTL_MS);
      await user.save();
      await sendPasswordResetEmail(email, code);
    }
    const response = { message: 'reset_code_sent' };
    if (shouldIncludeDevCode()) response.code = code;
    return res.json(response);
  } catch (e) {
    return res.status(500).json({ error: 'forgot_failed' });
  }
}
async function resetPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || '');
    const newPassword = String(req.body.newPassword || '');
    if (!email || !code || !newPassword) return res.status(400).json({ error: 'missing_fields' });
    if (newPassword.length < 8) return res.status(400).json({ error: 'weak_password' });
    const user = await User.findOne({ email });
    if (!user || !user.passwordResetCode || !user.passwordResetExpires) return res.status(400).json({ error: 'invalid_reset' });
    if (user.passwordResetExpires.getTime() < Date.now()) return res.status(400).json({ error: 'code_expired' });
    const ok = await bcrypt.compare(code, user.passwordResetCode);
    if (!ok) return res.status(400).json({ error: 'invalid_code' });
    const hash = await bcrypt.hash(newPassword, 12);
    user.passwordHash = hash;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return res.json({ message: 'password_reset_ok' });
  } catch (e) {
    return res.status(500).json({ error: 'reset_failed' });
  }
}
module.exports = { signup, verifyEmail, resendCode, login, forgotPassword, resetPassword };
