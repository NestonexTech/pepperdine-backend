const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");

async function addMenuItem(req, res) {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) return res.status(404).json({ error: "restaurant_not_found" });
    if (restaurant.status !== "approved") {
      return res.status(403).json({ error: "only_approved_restaurants_can_add_menu" });
    }

    const name = String(req.body.name || "").trim();
    const description = String(req.body.description || "").trim();
    const price = Number(req.body.price);
    const category = String(req.body.category || "").trim();

    if (!name || !category) return res.status(400).json({ error: "missing_fields" });
    if (typeof price !== "number" || isNaN(price) || price < 0) {
      return res.status(400).json({ error: "invalid_price" });
    }

    const item = await MenuItem.create({
      restaurant: restaurant._id,
      name,
      description,
      price,
      category,
    });
    return res.status(201).json({
      message: "item_added",
      item: {
        _id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "add_item_failed" });
  }
}

async function getMenuByRestaurant(req, res) {
  try {
    const restaurantId = req.query.restaurantId || req.params.restaurantId;
    if (!restaurantId) return res.status(400).json({ error: "missing_restaurant_id" });

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "restaurant_not_found" });

    const items = await MenuItem.find({ restaurant: restaurantId }).sort({ category: 1, name: 1 }).lean();

    const byCategory = {};
    for (const item of items) {
      const cat = item.category || "Other";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({
        _id: item._id,
        name: item.name,
        description: item.description,
        price: item.price,
      });
    }

    const categories = Object.entries(byCategory).map(([name, itemsList]) => ({
      category: name,
      items: itemsList,
    }));

    return res.json({ restaurantId, restaurantName: restaurant.restaurantName, categories });
  } catch (e) {
    return res.status(500).json({ error: "get_menu_failed" });
  }
}

module.exports = { addMenuItem, getMenuByRestaurant };
