const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");

async function placeOrder(req, res) {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const {
      restaurantId,
      items,
      deliveryLocation,
      roomNo,
      tip,
      paymentType, // "full_card" | "split_mealpoints_card"
    } = req.body || {};

    if (!restaurantId) return res.status(400).json({ error: "missing_restaurant_id" });
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "missing_items" });
    }
    if (!paymentType || !["full_card", "split_mealpoints_card"].includes(paymentType)) {
      return res.status(400).json({ error: "invalid_payment_type" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ error: "restaurant_not_found" });
    if (!restaurant.verified || restaurant.status !== "approved") {
      return res.status(400).json({ error: "restaurant_not_available" });
    }

    const normalizedItems = [];
    for (const raw of items) {
      const menuItemId = raw && (raw.menuItemId || raw.menuItem || raw.id);
      const quantity = Number(raw && raw.quantity ? raw.quantity : 1);
      if (!menuItemId) {
        return res.status(400).json({ error: "invalid_item" });
      }
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return res.status(400).json({ error: "invalid_quantity" });
      }

      const menuItem = await MenuItem.findOne({ _id: menuItemId, restaurant: restaurantId });
      if (!menuItem) {
        return res.status(400).json({ error: "item_not_in_restaurant_menu" });
      }

      normalizedItems.push({
        menuItem: menuItem._id,
        quantity,
      });
    }

    const numericTip = tip !== undefined ? Number(tip) : 0;
    if (!Number.isFinite(numericTip) || numericTip < 0) {
      return res.status(400).json({ error: "invalid_tip" });
    }

    const order = await Order.create({
      user: userId,
      restaurant: restaurant._id,
      items: normalizedItems,
      deliveryLocation: deliveryLocation ? String(deliveryLocation).trim() : undefined,
      roomNo: roomNo ? String(roomNo).trim() : undefined,
      tip: numericTip,
      paymentType,
      status: "new",
    });

    // increment restaurant's "new" orders count
    try {
      await Restaurant.updateOne(
        { _id: restaurant._id },
        { $inc: { newOrdersCount: 1 } }
      );
    } catch (_) {
      // ignore counter errors so order placement still succeeds
    }

    return res.status(201).json({
      message: "order_placed",
      order: {
        _id: order._id,
        restaurant: order.restaurant,
        items: order.items,
        deliveryLocation: order.deliveryLocation,
        roomNo: order.roomNo,
        tip: order.tip,
        paymentType: order.paymentType,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "place_order_failed" });
  }
}

module.exports = {
  placeOrder,
};

