const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    items: { type: [orderItemSchema], default: [], validate: (v) => Array.isArray(v) && v.length > 0 },

    deliveryLocation: { type: String, trim: true },
    roomNo: { type: String, trim: true },
    tip: { type: Number, min: 0, default: 0 },

    paymentType: {
      type: String,
      enum: ["full_card", "split_mealpoints_card"],
      required: true,
    },

    status: {
      type: String,
      enum: ["new", "preparing", "completed"],
      default: "new",
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

