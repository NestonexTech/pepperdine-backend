const express = require("express");
const { adminLogin } = require("../controllers/adminController");
const { decodeAdminToken } = require("../middleware/admin");
const router = express.Router();

router.post("/login", adminLogin);

module.exports = router;
