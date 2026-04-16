const router = require("express").Router();
const Expense = require("../models/Expense");
const { createId, isDatabaseReady, withStore } = require("../lib/devStore");

const normalizeTags = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag || "").trim())
      .filter(Boolean)
      .slice(0, 6);
  }

  return String(value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 6);
};

const buildPayload = (body) => ({
  userId: body.userId,
  title: (body.title || body.category || body.type || "Entry").trim(),
  amount: Number(body.amount || 0),
  type: body.type === "income" ? "income" : "expense",
  category: (body.category || "General").trim(),
  date: body.date,
  paymentMethod: (body.paymentMethod || "Cash").trim(),
  wallet: (body.wallet || "Primary").trim(),
  status: body.status === "pending" ? "pending" : "cleared",
  tags: normalizeTags(body.tags),
  recurring: Boolean(body.recurring),
  notes: (body.notes || "").trim(),
});

// Add
router.post("/add", async (req, res) => {
  try {
    const payload = buildPayload(req.body);

    if (isDatabaseReady()) {
      const exp = new Expense(payload);
      await exp.save();
      return res.status(201).json(exp);
    }

    const exp = await withStore((store) => {
      const nextExpense = {
        ...payload,
        _id: createId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.expenses.push(nextExpense);
      return nextExpense;
    });

    res.status(201).json(exp);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get
router.get("/:userId", async (req, res) => {
  try {
    const data = isDatabaseReady()
      ? await Expense.find({ userId: req.params.userId }).sort({
          date: -1,
          createdAt: -1,
        })
      : await withStore((store) =>
          store.expenses
            .filter((expense) => expense.userId === req.params.userId)
            .sort(
              (left, right) =>
                new Date(right.date) - new Date(left.date) ||
                new Date(right.createdAt || 0) - new Date(left.createdAt || 0),
            ),
        );
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    if (isDatabaseReady()) {
      await Expense.findByIdAndDelete(req.params.id);
    } else {
      await withStore((store) => {
        store.expenses = store.expenses.filter(
          (expense) => expense._id !== req.params.id,
        );
      });
    }
    res.send("Deleted");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✏️ UPDATE EXPENSE
router.put("/:id", async (req, res) => {
  try {
    const payload = buildPayload(req.body);
    let updatedExpense;

    if (isDatabaseReady()) {
      updatedExpense = await Expense.findByIdAndUpdate(req.params.id, payload, {
        new: true,
        runValidators: true,
      });
    } else {
      updatedExpense = await withStore((store) => {
        const expense = store.expenses.find((item) => item._id === req.params.id);
        if (!expense) return null;
        Object.assign(expense, payload, { updatedAt: new Date().toISOString() });
        return expense;
      });
    }

    res.json(updatedExpense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
