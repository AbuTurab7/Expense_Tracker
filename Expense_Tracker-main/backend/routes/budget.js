const router = require("express").Router();
const Budget = require("../models/Budget");
const { createId, isDatabaseReady, withStore } = require("../lib/devStore");

// Set Budget
router.post("/set", async (req, res) => {
  try {
    const {
      userId,
      amount = 0,
      savingsTarget = 0,
      alertThreshold = 80,
      currency = "INR",
    } = req.body;

    let budget;

    if (isDatabaseReady()) {
      budget = await Budget.findOne({ userId });

      if (budget) {
        budget.amount = Number(amount || 0);
        budget.savingsTarget = Number(savingsTarget || 0);
        budget.alertThreshold = Number(alertThreshold || 80);
        budget.currency = currency || "INR";
        await budget.save();
      } else {
        budget = new Budget({
          userId,
          amount: Number(amount || 0),
          savingsTarget: Number(savingsTarget || 0),
          alertThreshold: Number(alertThreshold || 80),
          currency: currency || "INR",
        });
        await budget.save();
      }
    } else {
      budget = await withStore((store) => {
        const existing = store.budgets.find((item) => item.userId === userId);
        if (existing) {
          existing.amount = Number(amount || 0);
          existing.savingsTarget = Number(savingsTarget || 0);
          existing.alertThreshold = Number(alertThreshold || 80);
          existing.currency = currency || "INR";
          existing.updatedAt = new Date().toISOString();
          return existing;
        }

        const nextBudget = {
          _id: createId(),
          userId,
          amount: Number(amount || 0),
          savingsTarget: Number(savingsTarget || 0),
          alertThreshold: Number(alertThreshold || 80),
          currency: currency || "INR",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        store.budgets.push(nextBudget);
        return nextBudget;
      });
    }

    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Budget
router.get("/:userId", async (req, res) => {
  try {
    const budget = isDatabaseReady()
      ? await Budget.findOne({ userId: req.params.userId })
      : await withStore((store) =>
          store.budgets.find((item) => item.userId === req.params.userId) || null,
        );
    res.json(budget);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
