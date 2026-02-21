const jwt = require('jsonwebtoken');
function decodeAdminToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'missing_token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || '');
    if (payload.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
    req.adminId = payload.sub;
    next();
  } catch (e) {
    res.status(401).json({ error: 'invalid_token' });
  }
}
module.exports = { decodeAdminToken };
