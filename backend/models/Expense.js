const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  category: String,
  date: String,
  paymentMethod: String,
  notes: String
});

module.exports = mongoose.model("Expense", expenseSchema);
