const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
async function seedAdminIfMissing() {
  const count = await Admin.countDocuments();
  if (count > 0) return;
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || '');
  if (!email || !password) return;
  const hash = await bcrypt.hash(password, 12);
  await Admin.create({ email, name: 'Administrator', passwordHash: hash });
}
module.exports = { seedAdminIfMissing };
