const router = require("express").Router();
const Expense = require("../models/Expense");

// Add
router.post("/add", async (req, res) => {
  const exp = new Expense(req.body);
  await exp.save();
  res.send("Added");
});

// Get
router.get("/:userId", async (req, res) => {
  const data = await Expense.find({ userId: req.params.userId });
  res.json(data);
});

// Delete
router.delete("/:id", async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  res.send("Deleted");
});

// ✏️ UPDATE EXPENSE
router.put("/:id", async (req, res) => {
  try {
    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      {
        amount: req.body.amount,
        category: req.body.category,
        date: req.body.date,
        paymentMethod: req.body.paymentMethod,
        notes: req.body.notes
      },
      { new: true } // return updated data
    );

    res.json(updatedExpense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
