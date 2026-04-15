const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Register
router.post("/register", async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  const user = new User({
    email: req.body.email,
    password: hashed
  });
  await user.save();
  res.send("Registered");
});

// Login
router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.send("Invalid");

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.send("Invalid");

  res.json(user);
});

module.exports = router;
