const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Restaurant = require("../models/Restaurant");
const generateCode = require("../utils/generateCode");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../services/mailer");

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function shouldIncludeDevCode() {
  const debug = (process.env.EMAIL_DEBUG_CODES || "false") === "true";
  const transport = (process.env.EMAIL_TRANSPORT || "").toLowerCase();
  const host = process.env.SMTP_HOST || "";
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const missingSmtp = !host || !user || !pass;
  return debug || transport === "json" || missingSmtp;
}

async function signup(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "").trim();
    const phoneNo = String(req.body.phoneNo || "").trim();
    const name = String(req.body.name || "").trim();
    const restaurantName = String(req.body.restaurantName || "").trim();
    const restaurantLocation = String(req.body.restaurantLocation || "").trim();
    const license = String(req.body.license || "").trim();
    const taxID = String(req.body.taxID || "").trim();

    if (!email || !password || !phoneNo || !name || !restaurantName || !restaurantLocation || !license || !taxID) {
      return res.status(400).json({ error: "missing_fields" });
    }
    if (password.length < 8) return res.status(400).json({ error: "weak_password" });

    const existing = await Restaurant.findOne({ email });
    if (existing) return res.status(409).json({ error: "email_in_use" });

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateCode();
    const hashedCode = await bcrypt.hash(code, 12);
    const now = Date.now();

    const restaurant = await Restaurant.create({
      email,
      passwordHash,
      phoneNo,
      name,
      restaurantName,
      restaurantLocation,
      license,
      taxID,
      verified: false,
      status: "pending",
      emailVerificationCode: hashedCode,
      emailVerificationExpires: new Date(now + CODE_TTL_MS),
      lastEmailCodeSentAt: new Date(now),
    });

    try {
      await sendVerificationEmail(restaurant.email, code);
    } catch (sendErr) {
      try {
        await Restaurant.deleteOne({ _id: restaurant._id });
      } catch (_) {}
      return res.status(500).json({ error: "email_send_failed" });
    }

    const response = {
      message: `Signup successful. Please verify your email ${restaurant.email}. Your restaurant will be reviewed by admin.`,
    };
    if (shouldIncludeDevCode()) response.code = code;
    return res.status(201).json(response);
  } catch (e) {
    return res.status(500).json({ error: "signup_failed" });
  }
}

async function verifyEmail(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "");
    if (!email || !code) return res.status(400).json({ error: "missing_fields" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ error: "not_found" });
    if (!restaurant.emailVerificationCode || !restaurant.emailVerificationExpires) {
      return res.status(400).json({ error: "no_pending_verification" });
    }
    if (restaurant.emailVerificationExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "code_expired" });
    }
    const ok = await bcrypt.compare(code, restaurant.emailVerificationCode);
    if (!ok) return res.status(400).json({ error: "invalid_code" });

    restaurant.verified = true;
    restaurant.emailVerificationCode = undefined;
    restaurant.emailVerificationExpires = undefined;
    await restaurant.save();
    return res.json({ message: "email_verified" });
  } catch (e) {
    return res.status(500).json({ error: "verify_failed" });
  }
}

async function resendCode(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "missing_email" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ error: "not_found" });
    if (restaurant.verified) return res.status(400).json({ error: "already_verified" });

    const now = Date.now();
    if (
      restaurant.lastEmailCodeSentAt &&
      now - restaurant.lastEmailCodeSentAt.getTime() < RESEND_COOLDOWN_MS
    ) {
      return res.status(429).json({ error: "resend_too_soon" });
    }

    const code = generateCode();
    const hashedCode = await bcrypt.hash(code, 12);
    restaurant.emailVerificationCode = hashedCode;
    restaurant.emailVerificationExpires = new Date(now + CODE_TTL_MS);
    restaurant.lastEmailCodeSentAt = new Date(now);
    await restaurant.save();
    await sendVerificationEmail(restaurant.email, code);

    const response = { message: "code_resent" };
    if (shouldIncludeDevCode()) response.code = code;
    return res.json(response);
  } catch (e) {
    return res.status(500).json({ error: "resend_failed" });
  }
}

async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");
    if (!email || !password) return res.status(400).json({ error: "missing_fields" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(401).json({ error: "invalid_credentials" });
    if (!restaurant.verified) return res.status(403).json({ error: "email_not_verified" });
    if (restaurant.status === "rejected") return res.status(403).json({ error: "restaurant_rejected" });
    if (restaurant.status !== "approved") {
      return res.status(403).json({ error: "restaurant_pending_approval" });
    }

    const ok = await bcrypt.compare(password, restaurant.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });

    const token = jwt.sign(
      { type: "restaurant" },
      process.env.JWT_SECRET || "",
      { subject: String(restaurant._id), expiresIn: process.env.JWT_EXPIRES || "7d" }
    );
    return res.json({ token });
  } catch (e) {
    return res.status(500).json({ error: "login_failed" });
  }
}

async function forgotPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) return res.status(400).json({ error: "missing_email" });

    const restaurant = await Restaurant.findOne({ email });
    const code = generateCode();
    const now = Date.now();
    const hashedCode = await bcrypt.hash(code, 12);
    if (restaurant) {
      restaurant.passwordResetCode = hashedCode;
      restaurant.passwordResetExpires = new Date(now + CODE_TTL_MS);
      await restaurant.save();
      await sendPasswordResetEmail(email, code);
    }

    const response = { message: "reset_code_sent" };
    if (shouldIncludeDevCode()) response.code = code;
    return res.json(response);
  } catch (e) {
    return res.status(500).json({ error: "forgot_failed" });
  }
}

async function resetPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = String(req.body.code || "");
    const newPassword = String(req.body.newPassword || "");
    if (!email || !code || !newPassword) return res.status(400).json({ error: "missing_fields" });
    if (newPassword.length < 8) return res.status(400).json({ error: "weak_password" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant || !restaurant.passwordResetCode || !restaurant.passwordResetExpires) {
      return res.status(400).json({ error: "invalid_reset" });
    }
    if (restaurant.passwordResetExpires.getTime() < Date.now()) {
      return res.status(400).json({ error: "code_expired" });
    }
    const ok = await bcrypt.compare(code, restaurant.passwordResetCode);
    if (!ok) return res.status(400).json({ error: "invalid_code" });

    const hash = await bcrypt.hash(newPassword, 12);
    restaurant.passwordHash = hash;
    restaurant.passwordResetCode = undefined;
    restaurant.passwordResetExpires = undefined;
    await restaurant.save();
    return res.json({ message: "password_reset_ok" });
  } catch (e) {
    return res.status(500).json({ error: "reset_failed" });
  }
}

module.exports = {
  signup,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword,
};
