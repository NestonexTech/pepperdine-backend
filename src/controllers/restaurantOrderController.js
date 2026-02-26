const Order = require("../models/Order");
const Restaurant = require("../models/Restaurant");

const STATUS_FIELD_MAP = {
  new: "newOrdersCount",
  preparing: "preparingOrdersCount",
  completed: "completedOrdersCount",
};

async function updateOrderStatus(req, res) {
  try {
    const restaurantId = req.restaurantId;
    if (!restaurantId) return res.status(401).json({ error: "unauthorized" });

    const orderId = req.params.orderId || req.body.orderId;
    const nextStatus = String(req.body.status || "").trim();

    if (!orderId) return res.status(400).json({ error: "missing_order_id" });
    if (!nextStatus || !["new", "preparing", "completed"].includes(nextStatus)) {
      return res.status(400).json({ error: "invalid_status" });
    }

    const order = await Order.findOne({ _id: orderId, restaurant: restaurantId });
    if (!order) return res.status(404).json({ error: "order_not_found" });

    const prevStatus = order.status;
    if (prevStatus === nextStatus) {
      return res.json({
        message: "status_unchanged",
        order: {
          _id: order._id,
          status: order.status,
        },
      });
    }

    order.status = nextStatus;
    await order.save();

    // Safely adjust restaurant counters
    try {
      const restaurant = await Restaurant.findById(restaurantId);
      if (restaurant) {
        const prevField = STATUS_FIELD_MAP[prevStatus];
        const nextField = STATUS_FIELD_MAP[nextStatus];
        if (prevField) {
          restaurant[prevField] = Math.max(0, Number(restaurant[prevField] || 0) - 1);
        }
        if (nextField) {
          restaurant[nextField] = Math.max(0, Number(restaurant[nextField] || 0) + 1);
        }
        await restaurant.save();
      }
    } catch (_) {
      // ignore counter errors; main status change already saved
    }

    return res.json({
      message: "status_updated",
      order: {
        _id: order._id,
        status: order.status,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "update_status_failed" });
  }
}

module.exports = {
  updateOrderStatus,
};

