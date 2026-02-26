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
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phoneNo: { type: String, required: true, trim: true },
    CWID: { type: String, trim: true },
    location: { type: String, trim: true },
    role: { type: String, default: "user" },
    passwordHash: { type: String, required: true },
    verified: { type: Boolean, default: false },
    emailVerificationCode: { type: String },
    emailVerificationExpires: { type: Date },
    lastEmailCodeSentAt: { type: Date },
    passwordResetCode: { type: String },
    passwordResetExpires: { type: Date },
    mealPoints: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const User = mongoose.model("User", schema);
module.exports = User;
