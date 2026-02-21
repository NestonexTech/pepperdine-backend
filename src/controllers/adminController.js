const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");
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

module.exports = { adminLogin };
