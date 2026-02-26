const express = require("express");
const { placeOrder } = require("../controllers/orderController");
const { decodeToken } = require("../middleware/auth");

const router = express.Router();

// User places an order (requires user JWT)
router.post("/", decodeToken, placeOrder);

module.exports = router;

