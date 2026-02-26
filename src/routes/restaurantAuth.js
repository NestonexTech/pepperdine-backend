const express = require("express");
const {
  signup,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword,
} = require("../controllers/restaurantAuthController");
const { addMenuItem } = require("../controllers/menuController");
const { updateOrderStatus } = require("../controllers/restaurantOrderController");
const { decodeRestaurantToken } = require("../middleware/restaurantAuth");

const router = express.Router();

router.post("/signup", signup);
router.post("/verify", verifyEmail);
router.post("/resend-code", resendCode);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/me", decodeRestaurantToken, (req, res) => {
  res.json({ restaurantId: req.restaurantId });
});

router.post("/menu/items", decodeRestaurantToken, addMenuItem);

// Restaurant can update status of its own orders
router.patch("/orders/:orderId/status", decodeRestaurantToken, updateOrderStatus);

module.exports = router;
