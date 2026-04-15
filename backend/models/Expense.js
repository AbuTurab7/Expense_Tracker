const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  category: String,
  date: String,
  paymentMethod: {
  type: String,
  default: "Cash",
},
  notes: String,
});

module.exports = mongoose.model("Expense", expenseSchema);
