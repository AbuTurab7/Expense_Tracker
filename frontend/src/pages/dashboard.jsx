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
    notes: "",
    paymentMethod: "Cash",
  });
  const [customCategory, setCustomCategory] = useState("");
  const [editId, setEditId] = useState(null);
  const [budget, setBudget] = useState(0);
  const [budgetInput, setBudgetInput] = useState("");
  const [darkMode, setDarkMode] = useState(true);
  const [openModal, setOpenModal] = useState(false);

   const baseURL = process.env.REACT_APP_API_URL;
  // const baseURL = `http://localhost:5000`;

  const categories = ["Food", "Travel", "Shopping", "Bills"];

  useEffect(() => {
    if (!user) return (window.location.href = "/");
    loadData();
  }, [user]);

 

  const loadData = async () => {
    try {
      const exp = await axios.get(`${baseURL}/api/expense/${user._id}`);
      const bud = await axios.get(`${baseURL}/api/budget/${user._id}`);

      setExpenses(exp.data);
      if (bud.data) {
        setBudget(bud.data.amount || 0);

      }
    } catch (err) {
      console.log("Error loading data");
    }
  };

  const updateBudget = async () => {
    if (!budgetInput || budgetInput <= 0) return;

    try {
      const res = await axios.post(`${baseURL}/api/budget/set`, {
        userId: user._id,
        amount: Number(budgetInput),
      });

      setBudget(res.data.amount);
      setBudgetInput("");
    } catch {
      console.log("Failed to update budget");
    }
  };

  // ✅ EXPORT EXCEL
  const exportExcel = () => {
    const data = expenses.map((e) => ({
      Category: e.category,
      Amount: e.amount,
      Date: new Date(e.date).toLocaleDateString(),
      Note: e.notes || "",
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
      e.notes || "",
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

    const payload = {
      ...form,
      category: finalCategory,
      amount: Number(form.amount),
      userId: user._id,
    };

    if (editId) {
      await axios.put(`${baseURL}/api/expense/${editId}`, payload);
    } else {
      await axios.post(`${baseURL}/api/expense/add`, payload);
    }

    closeModal();
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const openEdit = (e) => {
    const isCustom = !categories.includes(e.category);

    setEditId(e._id);
    setForm({
      amount: e.amount,
      category: isCustom ? "custom" : e.category,
      date: e.date?.split("T")[0],
      notes: e.notes || "",
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
      notes: "",
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
      notes: "",
    });
    setCustomCategory("");
  };

  const deleteExpense = async (id) => {
    await axios.delete(`${baseURL}/api/expense/${id}`);
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
        now - d > 7 * 24 * 60 * 60 * 1000 && now - d <= 14 * 24 * 60 * 60 * 1000
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
        messages.push(
          `📉 You spent ${Math.abs(diff).toFixed(0)}% less than last week`,
        );
      }
    }
    const topCategory = Object.entries(categoryMap).sort(
      (a, b) => b[1] - a[1],
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
    <div className={`min-h-screen p-3 md:p-6 ${theme}`}>
      {/* Navbar */}
      <div className="sticky top-3 z-50 mb-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-0 justify-between items-center px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 shadow-lg">
          <h1 className="text-lg md:text-xl font-semibold text-center">
            💸 Expense Tracker
          </h1>

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-3 py-1 rounded-lg bg-indigo-500 text-white text-sm"
            >
              {darkMode ? "Light" : "Dark"}
            </button>

            <button
              onClick={handleLogout}
              className="bg-red-500 text-sm px-3 py-1 rounded-lg text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Export */}
      {expenses.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <button className="bg-green-500 px-4 py-2 rounded text-white text-sm" onClick={exportExcel}>
            Export Excel
          </button>
          <button className="bg-purple-500 px-4 py-2 rounded text-white text-sm" onClick={exportPDF}>
            Export PDF
          </button>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className={`${card} p-5 rounded-2xl`}>
          <p className="opacity-70 text-sm">Total</p>
          <p className="text-2xl font-bold">₹{total}</p>
        </div>

        <div className={`${card} p-5 rounded-2xl`}>
          <p className="opacity-70 text-sm">Budget</p>
          <input
            className="mt-2 w-full p-2 rounded bg-transparent border"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
          />
          <button
            onClick={updateBudget}
            className="mt-2 w-full bg-indigo-500 py-2 rounded text-white"
          >
            Set
          </button>
        </div>

        <div className={`${card} p-5 rounded-2xl`}>
          <p className="opacity-70 text-sm">Remaining</p>
          <p
            className={`text-2xl font-bold ${
              budget - total < 0 ? "text-red-400" : ""
            }`}
          >
            ₹{budget - total}
          </p>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className={`${card} p-5 rounded-2xl mb-6`}>
          <h2 className="font-semibold mb-3">AI Insights</h2>
          <div className="space-y-2">
            {insights.map((m, i) => (
              <div key={i} className="text-sm p-3 rounded bg-indigo-500/10">
                {m}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={`${card} p-4 rounded-2xl h-[260px] md:h-[320px]`}>
            <Pie
              data={chartData}
             options={{ ...chartOptions, maintainAspectRatio: false }}
             />
          </div>

          <div className={`${card} p-4 rounded-2xl h-[260px] md:h-[320px]`}>
                        <Bar
              data={chartData}
              options={{ ...chartOptions, maintainAspectRatio: false }}
            />
          </div>
        </div>
      )}

      {/* Add */}
      <button
        onClick={openAdd}
        className="mb-6 w-full md:w-auto bg-indigo-500 px-5 py-2 rounded-xl text-white"
      >
        + Add Expense
      </button>

      {/* Transactions */}
      <div className={`${card} p-4 md:p-6 rounded-2xl`}>
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>

        <div className="space-y-3">
          {expenses.map((e) => (
            <div
              key={e._id}
              className="flex flex-col md:flex-row md:justify-between gap-2 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div>
                <p className="font-medium">{e.category}</p>
                <p className="text-xs opacity-60">
                  {new Date(e.date).toLocaleDateString()} • {e.paymentMethod}
                </p>
                {e.notes && (
                  <p className="text-xs mt-1 italic opacity-80">
                    📝 {e.notes}
                  </p>
                )}
              </div>

              <div className="font-semibold">₹{e.amount}</div>

              <div className="flex gap-3 text-sm">
                <button onClick={() => openEdit(e)} className="text-blue-400">
                  Edit
                </button>
                <button onClick={() => deleteExpense(e._id)} className="text-red-400">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 p-3">
          <div
            className={`w-[95%] sm:w-[420px] p-5 rounded-2xl ${
              darkMode ? "bg-gray-900 text-white" : "bg-white text-black"
            }`}
          >
            <h2 className="text-lg font-semibold mb-4">
              {editId ? "Edit Expense" : "Add Expense"}
            </h2>

            <input
              className="w-full p-2 mb-3 border rounded"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />

            <input
              type="date"
              className="w-full p-2 mb-3 border rounded"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />

            <select
              className="w-full p-2 mb-3 border rounded"
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
                className="w-full p-2 mb-3 border rounded"
                placeholder="New category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
              />
            )}

            <select
              className="w-full p-2 mb-3 border rounded"
              value={form.paymentMethod}
              onChange={(e) =>
                setForm({ ...form, paymentMethod: e.target.value })
              }
            >
              <option>Cash</option>
              <option>UPI</option>
              <option>Card</option>
            </select>

            <textarea
              className="w-full p-2 mb-3 border rounded"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="flex-1 bg-indigo-500 text-white py-2 rounded"
              >
                {editId ? "Update" : "Add"}
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-400 text-white py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// {expenses.length > 0 && (
//         <div className="grid md:grid-cols-2 gap-6 mb-6">
//           <div className={`${card} p-5 rounded-2xl h-[300px]`}>
//             <Pie
//               data={chartData}
//               options={{ ...chartOptions, maintainAspectRatio: false }}
//             />
//           </div>
//           <div className={`${card} p-5 rounded-2xl h-[300px]`}>
//             <Bar
//               data={chartData}
//               options={{ ...chartOptions, maintainAspectRatio: false }}
//             />
//           </div>
//         </div>
//       )}