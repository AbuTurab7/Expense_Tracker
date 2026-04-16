const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  userId: String,
  amount: {
    type: Number,
    default: 0,
  },
  savingsTarget: {
    type: Number,
    default: 0,
  },
  alertThreshold: {
    type: Number,
    default: 80,
  },
  currency: {
    type: String,
    default: "INR",
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model("Budget", budgetSchema);
