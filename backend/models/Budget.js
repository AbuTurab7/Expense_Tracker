const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  type: String // monthly / weekly
});

module.exports = mongoose.model("Budget", budgetSchema);
