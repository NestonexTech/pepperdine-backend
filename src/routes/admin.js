const express = require("express");
const { adminLogin, listRestaurants, approveRestaurant, rejectRestaurant } = require("../controllers/adminController");
const { decodeAdminToken } = require("../middleware/admin");
const router = express.Router();

router.post("/login", adminLogin);

router.get("/restaurants", decodeAdminToken, listRestaurants);
router.post("/restaurants/:id/approve", decodeAdminToken, approveRestaurant);
router.post("/restaurants/:id/reject", decodeAdminToken, rejectRestaurant);

module.exports = router;
