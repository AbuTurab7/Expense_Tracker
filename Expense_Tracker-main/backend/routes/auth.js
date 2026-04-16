const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { createId, isDatabaseReady, withStore } = require("../lib/devStore");

const buildPublicUser = (user) => ({
  _id: user._id,
  name: user.name || "",
  email: user.email,
});

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();
    const displayName =
      (name || "").trim() || normalizedEmail.split("@")[0] || "User";

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // ✅ Check if user exists
    const existingUser = isDatabaseReady()
      ? await User.findOne({ email: normalizedEmail })
      : await withStore((store) =>
          store.users.find((user) => user.email === normalizedEmail),
        );

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // ✅ Hash password
    const hashed = await bcrypt.hash(password, 10);

    // ✅ Create user
    let user;

    if (isDatabaseReady()) {
      user = new User({
        name: displayName,
        email: normalizedEmail,
        password: hashed,
      });

      await user.save();
    } else {
      user = await withStore((store) => {
        const nextUser = {
          _id: createId(),
          name: displayName,
          email: normalizedEmail,
          password: hashed,
        };
        store.users.push(nextUser);
        return nextUser;
      });
    }

    res.status(201).json({
      message: "Registered successfully",
      user: buildPublicUser(user),
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
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = isDatabaseReady()
      ? await User.findOne({ email })
      : await withStore((store) => store.users.find((item) => item.email === email));
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.json(buildPublicUser(user));
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
