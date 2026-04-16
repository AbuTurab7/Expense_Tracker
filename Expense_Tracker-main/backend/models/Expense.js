const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  userId: String,
  title: {
    type: String,
    trim: true,
    default: "",
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  type: {
    type: String,
    enum: ["expense", "income"],
    default: "expense",
  },
  category: {
    type: String,
    required: true,
    trim: true,
  },
  date: {
    type: String,
    required: true,
  },
  paymentMethod: {
    type: String,
    default: "Cash",
    trim: true,
  },
  wallet: {
    type: String,
    default: "Primary",
    trim: true,
  },
  status: {
    type: String,
    enum: ["cleared", "pending"],
    default: "cleared",
  },
  tags: {
    type: [String],
    default: [],
  },
  recurring: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    trim: true,
    default: "",
  },
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
