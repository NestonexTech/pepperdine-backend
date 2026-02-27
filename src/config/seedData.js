const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Restaurant = require("../models/Restaurant");
const MenuItem = require("../models/MenuItem");
const Order = require("../models/Order");

const SEED_PASSWORD = "password123";

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function seedSampleDataIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount > 0) return;

  const passwordHash = await hashPassword(SEED_PASSWORD);

  // --- Users (verified + unverified variants) ---
  const users = await User.insertMany([
    {
      email: "alice@pepperdine.edu",
      firstName: "Alice",
      lastName: "Smith",
      phoneNo: "+15551234001",
      CWID: "CW001",
      location: "Malibu Campus",
      role: "user",
      passwordHash,
      verified: true,
    },
    {
      email: "bob@pepperdine.edu",
      firstName: "Bob",
      lastName: "Jones",
      phoneNo: "+15551234002",
      CWID: "CW002",
      location: "Drescher",
      role: "user",
      passwordHash,
      verified: true,
    },
    {
      email: "carol@pepperdine.edu",
      firstName: "Carol",
      lastName: "Lee",
      phoneNo: "+15551234003",
      role: "user",
      passwordHash,
      verified: false,
    },
  ]);
  const [alice, bob] = users;

  // --- Restaurants (pending, approved, rejected variants) ---
  const restaurants = await Restaurant.insertMany([
    {
      email: "pending@restaurant.com",
      passwordHash,
      phoneNo: "+15552221001",
      name: "Pending Owner",
      restaurantName: "Coming Soon Cafe",
      restaurantLocation: "123 Pending St",
      license: "LIC-PENDING-001",
      taxID: "TAX-PENDING-001",
      verified: true,
      status: "pending",
    },
    {
      email: "approved@restaurant.com",
      passwordHash,
      phoneNo: "+15552221002",
      name: "Approved Owner",
      restaurantName: "Seaside Grill",
      restaurantLocation: "456 Ocean Ave, Malibu",
      license: "LIC-APPROVED-001",
      taxID: "TAX-APPROVED-001",
      verified: true,
      status: "approved",
      newOrdersCount: 2,
      preparingOrdersCount: 1,
      completedOrdersCount: 3,
    },
    {
      email: "rejected@restaurant.com",
      passwordHash,
      phoneNo: "+15552221003",
      name: "Rejected Owner",
      restaurantName: "Rejected Bistro",
      restaurantLocation: "789 Reject Rd",
      license: "LIC-REJECTED-001",
      taxID: "TAX-REJECTED-001",
      verified: true,
      status: "rejected",
    },
  ]);
  const approvedRestaurant = restaurants[1];

  // --- Menu items (multiple categories for approved restaurant) ---
  const menuItems = await MenuItem.insertMany([
    {
      restaurant: approvedRestaurant._id,
      name: "Classic Burger",
      description: "Beef patty with lettuce, tomato, pickles",
      price: 12.99,
      category: "Burgers",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Veggie Burger",
      description: "Plant-based patty with avocado",
      price: 11.99,
      category: "Burgers",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Caesar Salad",
      description: "Romaine, parmesan, croutons, Caesar dressing",
      price: 9.99,
      category: "Salads",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Greek Salad",
      description: "Feta, olives, cucumber, tomato",
      price: 10.49,
      category: "Salads",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Iced Tea",
      description: "Fresh brewed, unsweetened or sweet",
      price: 2.99,
      category: "Drinks",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Lemonade",
      description: "House-made lemonade",
      price: 3.49,
      category: "Drinks",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Chocolate Brownie",
      description: "Warm brownie with walnuts",
      price: 5.99,
      category: "Desserts",
    },
    {
      restaurant: approvedRestaurant._id,
      name: "Ice Cream Sundae",
      description: "Vanilla ice cream, chocolate sauce, whipped cream",
      price: 6.49,
      category: "Desserts",
    },
  ]);

  // --- Orders (new, preparing, completed + full_card, split_mealpoints_card) ---
  await Order.insertMany([
    {
      user: alice._id,
      restaurant: approvedRestaurant._id,
      items: [
        { menuItem: menuItems[0]._id, quantity: 1 },
        { menuItem: menuItems[4]._id, quantity: 2 },
      ],
      deliveryLocation: "Sandbar Building, Room 101",
      roomNo: "101",
      tip: 2.0,
      paymentType: "full_card",
      status: "new",
    },
    {
      user: alice._id,
      restaurant: approvedRestaurant._id,
      items: [{ menuItem: menuItems[2]._id, quantity: 1 }],
      deliveryLocation: "Drescher Graduate Campus",
      roomNo: null,
      tip: 1.5,
      paymentType: "split_mealpoints_card",
      status: "preparing",
    },
    {
      user: bob._id,
      restaurant: approvedRestaurant._id,
      items: [
        { menuItem: menuItems[1]._id, quantity: 1 },
        { menuItem: menuItems[6]._id, quantity: 1 },
      ],
      deliveryLocation: "Malibu Campus, Main Hall",
      roomNo: "204",
      tip: 0,
      paymentType: "split_mealpoints_card",
      status: "completed",
    },
    {
      user: bob._id,
      restaurant: approvedRestaurant._id,
      items: [
        { menuItem: menuItems[0]._id, quantity: 2 },
        { menuItem: menuItems[5]._id, quantity: 2 },
      ],
      deliveryLocation: "Student Center",
      roomNo: null,
      tip: 3.0,
      paymentType: "full_card",
      status: "completed",
    },
  ]);

  console.log("Sample data seeded: users, restaurants, menu items, orders.");
  console.log("Seed user login: alice@pepperdine.edu / bob@pepperdine.edu with password:", SEED_PASSWORD);
  console.log("Seed restaurant login: approved@restaurant.com with password:", SEED_PASSWORD);
}

module.exports = { seedSampleDataIfEmpty, SEED_PASSWORD };
