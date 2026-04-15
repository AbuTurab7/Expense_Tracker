const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ Check if user exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // ✅ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create user
    const user = new User({
      email,
      password: hashed,
    });

    await user.save();

    res.status(201).json({
      message: "Registered successfully",
    });

  } catch (err) {
    console.log(err); // 🔍 VERY IMPORTANT for debugging
    res.status(500).json({
      message: "Server error",
    });
  }
});


// Login
router.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!user || !valid) {
  return res.status(400).json({ message: "Invalid credentials" });
}

  res.json(user);
});

module.exports = router;
