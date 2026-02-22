const jwt = require("jsonwebtoken");

function decodeRestaurantToken(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return res.status(401).json({ error: "missing_token" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "");
    if (payload.type !== "restaurant") return res.status(403).json({ error: "forbidden" });
    req.restaurantId = payload.sub;
    next();
  } catch (e) {
    res.status(401).json({ error: "invalid_token" });
  }
}

module.exports = { decodeRestaurantToken };
