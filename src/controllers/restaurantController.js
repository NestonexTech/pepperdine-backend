const Restaurant = require("../models/Restaurant");

function toPublicRestaurant(doc) {
  const o = doc && doc.toObject ? doc.toObject() : doc;
  const {
    passwordHash,
    emailVerificationCode,
    emailVerificationExpires,
    lastEmailCodeSentAt,
    passwordResetCode,
    passwordResetExpires,
    email,
    phoneNo,
    license,
    taxID,
    ...rest
  } = o || {};
  return rest;
}

async function listPublicRestaurants(req, res) {
  try {
    const restaurants = await Restaurant.find({
      verified: true,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .lean();

    const list = restaurants.map((r) => toPublicRestaurant(r));
    return res.json({ restaurants: list });
  } catch (e) {
    return res.status(500).json({ error: "list_public_restaurants_failed" });
  }
}

async function getPublicRestaurant(req, res) {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "missing_id" });

    const restaurant = await Restaurant.findOne({
      _id: id,
      verified: true,
      status: "approved",
    });
    if (!restaurant) return res.status(404).json({ error: "not_found" });

    return res.json({ restaurant: toPublicRestaurant(restaurant) });
  } catch (e) {
    return res.status(500).json({ error: "get_public_restaurant_failed" });
  }
}

module.exports = {
  listPublicRestaurants,
  getPublicRestaurant,
};

