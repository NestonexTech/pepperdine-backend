const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const { sendDriverCredentialsEmail } = require("../services/mailer");

async function adminLogin(req, res) {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password)
      return res.status(400).json({ error: "missing_fields" });
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ error: "invalid_credentials" });
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: "invalid_credentials" });
    const token = jwt.sign({ role: "admin" }, process.env.JWT_SECRET || "", {
      subject: String(admin._id),
      expiresIn: process.env.JWT_EXPIRES || "7d",
    });
    return res.json({ token });
  } catch (e) {
    return res.status(500).json({ error: "login_failed" });
  }
}

function toRestaurantListItem(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  const { passwordHash, emailVerificationCode, emailVerificationExpires, lastEmailCodeSentAt, passwordResetCode, passwordResetExpires, ...rest } = o;
  return rest;
}

async function listRestaurants(req, res) {
  try {
    const status = req.query.status; // pending | approved | rejected
    const filter = {};
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      filter.status = status;
    }
    const restaurants = await Restaurant.find(filter).sort({ createdAt: -1 }).lean();
    const list = restaurants.map((r) => {
      const { passwordHash, emailVerificationCode, emailVerificationExpires, lastEmailCodeSentAt, passwordResetCode, passwordResetExpires, ...rest } = r;
      return rest;
    });
    return res.json({ restaurants: list });
  } catch (e) {
    return res.status(500).json({ error: "list_failed" });
  }
}

async function approveRestaurant(req, res) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: "not_found" });
    restaurant.status = "approved";
    await restaurant.save();
    return res.json({ message: "restaurant_approved", restaurant: toRestaurantListItem(restaurant) });
  } catch (e) {
    return res.status(500).json({ error: "approve_failed" });
  }
}

async function rejectRestaurant(req, res) {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ error: "not_found" });
    restaurant.status = "rejected";
    await restaurant.save();
    return res.json({ message: "restaurant_rejected", restaurant: toRestaurantListItem(restaurant) });
  } catch (e) {
    return res.status(500).json({ error: "reject_failed" });
  }
}

module.exports = { adminLogin, listRestaurants, approveRestaurant, rejectRestaurant };
