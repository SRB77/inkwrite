const express = require("express");
const { requireAuth } = require("../middleware/auth");
const auth = require("../controllers/authController");

const router = express.Router();

router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/me", requireAuth, auth.me);

module.exports = router;
