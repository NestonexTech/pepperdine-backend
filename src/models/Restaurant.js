const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    phoneNo: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    restaurantName: { type: String, required: true, trim: true },
    restaurantLocation: { type: String, required: true, trim: true },
    license: { type: String, required: true, trim: true },
    taxID: { type: String, required: true, trim: true },
    verified: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    emailVerificationCode: { type: String },
    emailVerificationExpires: { type: Date },
    lastEmailCodeSentAt: { type: Date },
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
  },
  { timestamps: true }
);

const Restaurant = mongoose.model("Restaurant", schema);
module.exports = Restaurant;
