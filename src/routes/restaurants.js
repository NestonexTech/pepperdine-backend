const express = require("express");
const {
  listPublicRestaurants,
  getPublicRestaurant,
} = require("../controllers/restaurantController");

const router = express.Router();

// Public: list all approved & verified restaurants
router.get("/", listPublicRestaurants);

// Public: get single approved & verified restaurant by id
router.get("/:id", getPublicRestaurant);

module.exports = router;

