const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
});

module.exports = mongoose.model("Budget", budgetSchema);
