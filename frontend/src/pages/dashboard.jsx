import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
);

export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({
    amount: "",
    category: "Food",
    date: "",
    note: "",
  });
  const [customCategory, setCustomCategory] = useState("");
  const [editId, setEditId] = useState(null);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [openModal, setOpenModal] = useState(false);

 const baseURL = process.env.REACT_APP_API_URL;

  const categories = ["Food", "Travel", "Shopping", "Bills"];

  useEffect(() => {
    if (!user) return (window.location.href = "/");
    loadData();
  }, []);

  const loadData = async () => {
    const exp = await axios.get(
      `http://${baseURL}/api/expense/${user._id}`,
    );
    setExpenses(exp.data);
  };

  // ✅ EXPORT EXCEL
  const exportExcel = () => {
    const data = expenses.map((e) => ({
      Category: e.category,
      Amount: e.amount,
      Date: new Date(e.date).toLocaleDateString(),
      Note: e.note || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");

    XLSX.writeFile(wb, "expenses.xlsx");
  };

  // ✅ EXPORT PDF
  const exportPDF = () => {
  const doc = new jsPDF();

  const tableData = expenses.map((e) => [
    e.category,
    `₹${e.amount}`,
    new Date(e.date).toLocaleDateString(),
    e.note || "",
  ]);

  doc.text("Expense Report", 14, 15);

  autoTable(doc, {
    head: [["Category", "Amount", "Date", "Note"]],
    body: tableData,
    startY: 20,
  });

  doc.save("expenses.pdf");
};

  const handleSubmit = async () => {
    if (!form.amount || !form.date) return;

    const finalCategory =
      form.category === "custom" ? customCategory : form.category;

    if (editId) {
      await axios.put(`http://${baseURL}/api/expense/${editId}`, {
        ...form,
        category: finalCategory,
        amount: Number(form.amount),
      });
    } else {
      await axios.post(`http://${baseURL}/api/expense/add`, {
        ...form,
        category: finalCategory,
        amount: Number(form.amount),
        userId: user._id,
      });
    }

    closeModal();
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const openEdit = (e) => {
    const isCustom = !categories.includes(e.category);

    setEditId(e._id);
    setForm({
      amount: e.amount,
      category: isCustom ? "custom" : e.category,
      date: e.date?.split("T")[0],
      note: e.note || "",
    });

    if (isCustom) setCustomCategory(e.category);

    setOpenModal(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({
      amount: "",
      category: "Food",
      date: "",
      note: "",
    });
    setCustomCategory("");
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditId(null);
    setForm({
      amount: "",
      category: "Food",
      date: "",
      note: "",
    });
    setCustomCategory("");
  };

  const deleteExpense = async (id) => {
    await axios.delete(`http://${baseURL}/api/expense/${id}`);
    loadData();
  };

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const categoryMap = {};
  expenses.forEach((e) => {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
  });

  // 🔥 AI Insights
  const insights = useMemo(() => {
    if (!expenses.length) return [];

    const now = new Date();

    const thisWeek = expenses.filter((e) => {
      const d = new Date(e.date);
      return now - d <= 7 * 24 * 60 * 60 * 1000;
    });

    const lastWeek = expenses.filter((e) => {
      const d = new Date(e.date);
      return (
        now - d > 7 * 24 * 60 * 60 * 1000 &&
        now - d <= 14 * 24 * 60 * 60 * 1000
      );
    });

    const thisWeekTotal = thisWeek.reduce((s, e) => s + e.amount, 0);
    const lastWeekTotal = lastWeek.reduce((s, e) => s + e.amount, 0);

    const messages = [];

    if (lastWeekTotal > 0) {
      const diff = ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;

      if (diff > 0) {
        messages.push(`📈 You spent ${diff.toFixed(0)}% more than last week`);
      } else {
        messages.push(`📉 You spent ${Math.abs(diff).toFixed(0)}% less than last week`);
      }
    }

    const topCategory = Object.entries(categoryMap).sort(
      (a, b) => b[1] - a[1]
    )[0];

    if (topCategory) {
      messages.push(`🏷️ Top spending category: ${topCategory[0]}`);
    }

    if (budget && total > budget) {
      messages.push(`⚠️ You exceeded your budget by ₹${total - budget}`);
    }

    return messages;
  }, [expenses, total, budget]);

  const gradientColors = useMemo(
    () => [
      "rgba(99,102,241,0.8)",
      "rgba(34,197,94,0.8)",
      "rgba(245,158,11,0.8)",
      "rgba(239,68,68,0.8)",
      "rgba(168,85,247,0.8)",
    ],
    [],
  );

  const chartData = {
    labels: Object.keys(categoryMap),
    datasets: [
      {
        label: "Expenses",
        data: Object.values(categoryMap),
        backgroundColor: gradientColors,
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: { labels: { color: darkMode ? "#e5e7eb" : "#374151" } },
      tooltip: {
        backgroundColor: "rgba(17,24,39,0.9)",
        titleColor: "#fff",
        bodyColor: "#d1d5db",
        borderColor: "rgba(99,102,241,0.6)",
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: { ticks: { color: darkMode ? "#e5e7eb" : "#374151" } },
      y: { ticks: { color: darkMode ? "#e5e7eb" : "#374151" } },
    },
  };

  const theme = darkMode
    ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white"
    : "bg-gradient-to-br from-gray-100 to-white text-gray-900";

  const card = darkMode
    ? "bg-white/5 backdrop-blur-lg"
    : "bg-white/70 backdrop-blur";

  return (
    <div className={`min-h-screen p-6 ${theme}`}>
      {/* Navbar */}
      <div className="sticky top-4 z-50 mb-6">
        <div className="flex justify-between items-center px-6 py-3 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-lg">
          <h1 className="text-xl font-semibold">💸 Expense Tracker</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 rounded-lg bg-indigo-500 text-white"
            >
              {darkMode ? "Light" : "Dark"}
            </button>
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 transition text-white px-3 py-1 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>


       {/* Export Buttons */}
      {expenses.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={exportExcel}
            className="bg-green-500 px-4 py-2 rounded text-white"
          >
            Export Excel
          </button>

          <button
            onClick={exportPDF}
            className="bg-purple-500 px-4 py-2 rounded text-white"
          >
            Export PDF
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className={`${card} p-5 rounded-2xl shadow`}>
          <p className="opacity-70 text-sm">Total</p>
          <p className="text-2xl font-bold">₹{total}</p>
        </div>

        <div className={`${card} p-5 rounded-2xl shadow`}>
          <p className="opacity-70 text-sm">Budget</p>
          <input
            className="mt-2 w-full p-2 rounded bg-transparent border"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
          <button
            onClick={() => setBudget(Number(budgetInput))}
            className="mt-2 w-full bg-indigo-500 py-2 rounded text-white"
          >
            Set
          </button>
        </div>

        <div className={`${card} p-5 rounded-2xl shadow`}>
          <p className="opacity-70 text-sm">Remaining</p>
          <p className="text-2xl font-bold">₹{budget - total}</p>
        </div>
      </div>

      {/* 🔥 AI Insights */}
      {insights.length > 0 && (
        <div className={`${card} p-5 rounded-2xl mb-6`}>
          <h2 className="text-lg font-semibold mb-3">AI Insights</h2>
          <div className="space-y-2">
            {insights.map((msg, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-sm"
              >
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className={`${card} p-5 rounded-2xl h-[300px]`}>
          <Pie data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
        </div>
        <div className={`${card} p-5 rounded-2xl h-[300px]`}>
          <Bar data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
        </div>
      </div> */}

      {/* ❌ Hide charts if no data */}
      {expenses.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className={`${card} p-5 rounded-2xl h-[300px]`}>
            <Pie data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
          <div className={`${card} p-5 rounded-2xl h-[300px]`}>
            <Bar data={chartData} options={{ ...chartOptions, maintainAspectRatio: false }} />
          </div>
        </div>
      )}

      {/* Add Button */}
      <button onClick={openAdd} className="mb-6 bg-indigo-500 px-5 py-2 rounded-xl text-white shadow">
        + Add Expense
      </button>

      {/* Transactions */}
      <div className={`${card} p-6 rounded-2xl`}>
        <h2 className="text-xl font-semibold mb-5">Recent Transactions</h2>
        <div className="space-y-3">
          {expenses.map((e) => (
            <div key={e._id} className="flex justify-between items-center p-4 rounded-xl bg-white/5 hover:bg-white/10 transition backdrop-blur-md border border-white/10">
              <div className="flex flex-col">
                <span className="font-medium">{e.category}</span>
                <span className="text-sm opacity-60">
                  {new Date(e.date).toLocaleDateString()}
                </span>
                {e.note && (
                  <span className="text-xs opacity-50 italic mt-1">
                    {e.note}
                  </span>
                )}
              </div>
              <div className="font-semibold text-lg">₹{e.amount}</div>
              <div className="flex gap-3">
                <button onClick={() => openEdit(e)} className="text-blue-400">Edit</button>
                <button onClick={() => deleteExpense(e._id)} className="text-red-400">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal (same as before, unchanged) */}
      {openModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`p-6 rounded-2xl w-[90%] md:w-[400px] shadow-xl ${darkMode ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}>
            <h2 className="text-lg mb-4 font-semibold">
              {editId ? "Edit Expense" : "Add Expense"}
            </h2>

            <input
              className={`w-full p-2 border rounded mb-3 ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />

            <input
              type="date"
              className={`w-full p-2 border rounded mb-3 ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <select
              className={`w-full p-2 border rounded mb-3 ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
              <option value="custom">+ Add New</option>
            </select>

            {form.category === "custom" && (
              <input
                className={`w-full p-2 border rounded mb-3 ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
                placeholder="Enter new category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}

            <textarea
              className={`w-full p-2 border rounded mb-3 ${darkMode ? "bg-gray-800 text-white border-gray-700" : "bg-white text-gray-900 border-gray-300"}`}
              placeholder="Add note (optional)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />

            <div className="flex gap-3">
              <button onClick={handleSubmit} className="flex-1 bg-indigo-500 text-white py-2 rounded">
                {editId ? "Update" : "Add"}
              </button>
              <button onClick={closeModal} className="flex-1 bg-gray-400 text-white py-2 rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
