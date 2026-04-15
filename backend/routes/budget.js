const router = require("express").Router();
const Budget = require("../models/Budget");

// Set Budget
router.post("/set", async (req, res) => {
  const { userId, amount, type } = req.body;

  let budget = await Budget.findOne({ userId });

  if (budget) {
    budget.amount = amount;
    budget.type = type;
    await budget.save();
  } else {
    budget = new Budget({ userId, amount, type });
    await budget.save();
  }

  res.json(budget);
});

// Get Budget
router.get("/:userId", async (req, res) => {
  const budget = await Budget.findOne({ userId: req.params.userId });
  res.json(budget);
});

module.exports = router;
