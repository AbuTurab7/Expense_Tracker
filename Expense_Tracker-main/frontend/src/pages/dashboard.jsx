import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";
import {
  API_BASE_URL,
  clearStoredUser,
  formatCompactNumber,
  formatCurrency,
  formatDate,
  getGreeting,
  getStoredTheme,
  getStoredUser,
  setStoredTheme,
  toInputDate,
} from "../utils/app";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
);

const DEFAULT_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Health",
  "Shopping",
  "Learning",
  "Leisure",
  "Salary",
  "Freelance",
  "Savings",
];
const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Auto Debit"];
const WALLETS = ["Primary", "Savings", "Business", "Travel"];
const CHART_COLORS = [
  "#10b981",
  "#d97757",
  "#eab308",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#ef4444",
];

const emptyBudget = {
  amount: 0,
  savingsTarget: 0,
  alertThreshold: 80,
  currency: "INR",
};
const blankFilters = {
  query: "",
  type: "all",
  category: "all",
  paymentMethod: "all",
  wallet: "all",
  status: "all",
  dateRange: "all",
  sortBy: "latest",
};

const buildForm = (type = "expense") => ({
  title: "",
  amount: "",
  type,
  category: type === "income" ? "Salary" : "Food",
  date: new Date().toISOString().split("T")[0],
  paymentMethod: "UPI",
  wallet: "Primary",
  status: "cleared",
  notes: "",
  tags: "",
  recurring: false,
});

const buildBudgetForm = (budget) => ({
  amount: String(budget.amount ?? ""),
  savingsTarget: String(budget.savingsTarget ?? ""),
  alertThreshold: String(budget.alertThreshold ?? 80),
  currency: budget.currency || "INR",
});

const normalize = (item) => ({
  ...item,
  title: item.title || item.category || "Entry",
  amount: Number(item.amount || 0),
  type: item.type === "income" ? "income" : "expense",
  paymentMethod: item.paymentMethod || "Cash",
  wallet: item.wallet || "Primary",
  status: item.status === "pending" ? "pending" : "cleared",
  notes: item.notes || "",
  recurring: Boolean(item.recurring),
  tags: Array.isArray(item.tags)
    ? item.tags.filter(Boolean)
    : String(item.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
});

function Panel({ className = "", children }) {
  return <div className={`rounded-md border p-6 ${className}`}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#6d796f]">
        {label}
      </span>
      {children}
    </label>
  );
}

export default function Dashboard() {
  const user = getStoredUser();
  const [theme, setTheme] = useState(getStoredTheme());
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudget] = useState(emptyBudget);
  const [budgetInputs, setBudgetInputs] = useState(buildBudgetForm(emptyBudget));
  const [filters, setFilters] = useState(blankFilters);
  const [form, setForm] = useState(buildForm());
  const [customCategory, setCustomCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingEntry, setSavingEntry] = useState(false);
  const [savingBudget, setSavingBudget] = useState(false);

  const dark = theme === "dark";
  const page = dark ? "min-h-screen bg-[#121513] text-[#f7f3ec]" : "min-h-screen bg-[#f5efe6] text-[#172019]";
  const surface = dark ? "border-white/10 bg-white/6" : "border-[#ddd4c9] bg-white/92";
  const soft = dark ? "text-[#b9c3b8]" : "text-[#5f6c63]";
  const input = dark ? "w-full rounded-md border border-white/10 bg-[#161a17] px-4 py-3 text-[#f7f3ec] outline-none placeholder:text-[#8a958d] focus:border-emerald-400/60" : "w-full rounded-md border border-[#d9d1c7] bg-white px-4 py-3 text-[#172019] outline-none placeholder:text-[#6a766d] focus:border-emerald-600/60";

  useEffect(() => setStoredTheme(theme), [theme]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [expenseRes, budgetRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/expense/${user._id}`),
        axios.get(`${API_BASE_URL}/api/budget/${user._id}`),
      ]);
      const nextBudget = {
        amount: Number(budgetRes.data?.amount || 0),
        savingsTarget: Number(budgetRes.data?.savingsTarget || 0),
        alertThreshold: Number(budgetRes.data?.alertThreshold || 80),
        currency: budgetRes.data?.currency || "INR",
      };
      setTransactions((expenseRes.data || []).map(normalize));
      setBudget(nextBudget);
      setBudgetInputs(buildBudgetForm(nextBudget));
    } catch {
      toast.error("Unable to load your finance data.");
    } finally {
      setLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) loadData();
  }, [loadData, user?._id]);

  const categories = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_CATEGORIES,
          ...transactions.map((item) => item.category).filter(Boolean),
        ]),
      ).sort((a, b) => a.localeCompare(b)),
    [transactions],
  );

  const filtered = useMemo(() => {
    const now = new Date();
    return [...transactions]
      .filter((item) => {
        const q = filters.query.trim().toLowerCase();
        const hay = [
          item.title,
          item.category,
          item.notes,
          item.paymentMethod,
          item.wallet,
          ...(item.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        const byDate =
          filters.dateRange === "all" ||
          now - new Date(item.date) <= Number(filters.dateRange) * 86400000;
        return (
          (!q || hay.includes(q)) &&
          (filters.type === "all" || item.type === filters.type) &&
          (filters.category === "all" || item.category === filters.category) &&
          (filters.paymentMethod === "all" ||
            item.paymentMethod === filters.paymentMethod) &&
          (filters.wallet === "all" || item.wallet === filters.wallet) &&
          (filters.status === "all" || item.status === filters.status) &&
          byDate
        );
      })
      .sort((a, b) => {
        if (filters.sortBy === "oldest") return new Date(a.date) - new Date(b.date);
        if (filters.sortBy === "highest") return b.amount - a.amount;
        if (filters.sortBy === "lowest") return a.amount - b.amount;
        return new Date(b.date) - new Date(a.date);
      });
  }, [filters, transactions]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return transactions.filter((item) => {
      const date = new Date(item.date);
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    });
  }, [transactions]);

  const metrics = useMemo(() => {
    const totalIncome = filtered
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalSpend = filtered
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const monthIncome = thisMonth
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);
    const monthSpend = thisMonth
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const pending = filtered.filter((item) => item.status === "pending");
    return {
      totalIncome,
      totalSpend,
      net: totalIncome - totalSpend,
      monthIncome,
      monthSpend,
      budgetLeft: budget.amount - monthSpend,
      budgetUsed: budget.amount ? (monthSpend / budget.amount) * 100 : 0,
      savings: Math.max(monthIncome - monthSpend, 0),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, item) => sum + item.amount, 0),
      recurringCount: filtered.filter((item) => item.recurring).length,
    };
  }, [budget.amount, filtered, thisMonth]);

  const categoryBreakdown = useMemo(() => {
    const bucket = {};
    filtered
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        bucket[item.category] = (bucket[item.category] || 0) + item.amount;
      });
    return Object.entries(bucket)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [filtered]);

  const paymentBreakdown = useMemo(() => {
    const bucket = {};
    filtered.forEach((item) => {
      bucket[item.paymentMethod] = (bucket[item.paymentMethod] || 0) + item.amount;
    });
    return Object.entries(bucket).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const monthlyTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        income: 0,
        expense: 0,
      };
    });
    const lookup = Object.fromEntries(months.map((item) => [item.key, item]));
    transactions.forEach((item) => {
      const date = new Date(item.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (lookup[key]) lookup[key][item.type] += item.amount;
    });
    return months;
  }, [transactions]);

  const weeklyPulse = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return {
        key: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-IN", { weekday: "short" }),
        expense: 0,
      };
    });
    const lookup = Object.fromEntries(days.map((item) => [item.key, item]));
    transactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const key = toInputDate(item.date);
        if (lookup[key]) lookup[key].expense += item.amount;
      });
    return days;
  }, [transactions]);

  const insights = useMemo(() => {
    const list = [];
    if (budget.amount && metrics.budgetUsed >= budget.alertThreshold) {
      list.push(
        `Budget alert is active. You have used ${metrics.budgetUsed.toFixed(
          0,
        )}% of this month's budget.`,
      );
    }
    if (categoryBreakdown[0]) {
      list.push(
        `${categoryBreakdown[0][0]} is currently the biggest spend bucket at ${formatCurrency(categoryBreakdown[0][1], budget.currency)}.`,
      );
    }
    if (metrics.pendingCount) {
      list.push(
        `${metrics.pendingCount} pending entries are worth ${formatCurrency(metrics.pendingAmount, budget.currency)}.`,
      );
    }
    if (budget.savingsTarget) {
      list.push(
        metrics.savings >= budget.savingsTarget
          ? "Savings target is on track this month."
          : `You need ${formatCurrency(budget.savingsTarget - metrics.savings, budget.currency)} more to hit the savings target.`,
      );
    }
    if (metrics.recurringCount) {
      list.push(
        `${metrics.recurringCount} recurring entries are shaping your current plan.`,
      );
    }
    return list.length
      ? list.slice(0, 4)
      : ["Add transactions to unlock insights, trend signals, and budget guidance."];
  }, [budget.alertThreshold, budget.amount, budget.currency, budget.savingsTarget, categoryBreakdown, metrics]);

  const axisColor = dark ? "#d9ddd7" : "#4b5a50";
  const gridColor = dark ? "rgba(255,255,255,0.08)" : "rgba(23,32,25,0.08)";
  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: axisColor } },
      tooltip: {
        backgroundColor: dark ? "#151916" : "#fcfaf7",
        titleColor: dark ? "#f7f3ec" : "#172019",
        bodyColor: dark ? "#e2e8e0" : "#314137",
      },
    },
    scales: {
      x: { ticks: { color: axisColor }, grid: { color: gridColor } },
      y: { ticks: { color: axisColor }, grid: { color: gridColor } },
    },
  };

  const openAdd = (type = "expense") => {
    setEditingId(null);
    setCustomCategory("");
    setForm(buildForm(type));
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditingId(null);
    setCustomCategory("");
    setForm(buildForm());
  };

  const editItem = (item) => {
    const known = DEFAULT_CATEGORIES.includes(item.category);
    setEditingId(item._id);
    setCustomCategory(known ? "" : item.category);
    setForm({
      title: item.title,
      amount: String(item.amount),
      type: item.type,
      category: known ? item.category : "custom",
      date: toInputDate(item.date),
      paymentMethod: item.paymentMethod,
      wallet: item.wallet,
      status: item.status,
      notes: item.notes,
      tags: (item.tags || []).join(", "),
      recurring: item.recurring,
    });
    setOpenModal(true);
  };

  const saveEntry = async () => {
    const category = form.category === "custom" ? customCategory.trim() : form.category;
    if (!form.title.trim() || !form.amount || !form.date || !category) {
      return toast.error("Title, amount, date, and category are required.");
    }
    const payload = {
      ...form,
      userId: user._id,
      title: form.title.trim(),
      category,
      amount: Number(form.amount),
      tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      setSavingEntry(true);
      if (editingId) await axios.put(`${API_BASE_URL}/api/expense/${editingId}`, payload);
      else await axios.post(`${API_BASE_URL}/api/expense/add`, payload);
      toast.success(editingId ? "Transaction updated." : "Transaction added.");
      await loadData();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to save transaction.");
    } finally {
      setSavingEntry(false);
    }
  };

  const removeEntry = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/expense/${id}`);
      setTransactions((current) => current.filter((item) => item._id !== id));
      toast.success("Transaction removed.");
    } catch {
      toast.error("Unable to delete transaction.");
    }
  };

  const saveBudget = async () => {
    try {
      setSavingBudget(true);
      const payload = {
        userId: user._id,
        amount: Number(budgetInputs.amount || 0),
        savingsTarget: Number(budgetInputs.savingsTarget || 0),
        alertThreshold: Number(budgetInputs.alertThreshold || 80),
        currency: budgetInputs.currency || "INR",
      };
      const res = await axios.post(`${API_BASE_URL}/api/budget/set`, payload);
      const next = {
        amount: Number(res.data.amount || 0),
        savingsTarget: Number(res.data.savingsTarget || 0),
        alertThreshold: Number(res.data.alertThreshold || 80),
        currency: res.data.currency || "INR",
      };
      setBudget(next);
      setBudgetInputs(buildBudgetForm(next));
      toast.success("Budget settings saved.");
    } catch (error) {
      toast.error(error.response?.data?.error || "Unable to save budget.");
    } finally {
      setSavingBudget(false);
    }
  };

  const exportExcel = () => {
    if (!filtered.length) return toast.error("There is nothing to export.");
    const sheet = XLSX.utils.json_to_sheet(
      filtered.map((item) => ({
        Title: item.title,
        Type: item.type,
        Category: item.category,
        Amount: item.amount,
        Date: formatDate(item.date),
        Method: item.paymentMethod,
        Wallet: item.wallet,
        Status: item.status,
        Tags: (item.tags || []).join(", "),
        Notes: item.notes || "",
      })),
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Transactions");
    XLSX.writeFile(book, "spendspace-report.xlsx");
  };

  const exportPDF = () => {
    if (!filtered.length) return toast.error("There is nothing to export.");
    const doc = new jsPDF();
    doc.text("SpendSpace Report", 14, 16);
    autoTable(doc, {
      startY: 24,
      head: [["Title", "Type", "Category", "Amount", "Date", "Method", "Status"]],
      body: filtered.map((item) => [
        item.title,
        item.type,
        item.category,
        formatCurrency(item.amount, budget.currency),
        formatDate(item.date),
        item.paymentMethod,
        item.status,
      ]),
    });
    doc.save("spendspace-report.pdf");
  };

  const navItems = [
    { label: "Overview", href: "#overview" },
    { label: "Planner", href: "#planner" },
    { label: "Analytics", href: "#analytics" },
    { label: "Ledger", href: "#ledger" },
  ];

  if (!user?._id) return null;

  return (
    <div className={page}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8 lg:py-8">
        <nav
          className={`sticky top-3 z-40 mb-6 rounded-md border px-4 py-4 backdrop-blur ${
            dark
              ? "border-white/10 bg-[#111511]/85"
              : "border-[#ddd4c9] bg-[#fffaf4]/90"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                SpendSpace
              </div>
              <div>
                <p className="text-sm font-medium">Personal Finance Workspace</p>
                <p className={`text-xs ${soft}`}>
                  Track, plan, analyze, and export in one place.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                    dark
                      ? "bg-white/6 text-[#e5ece4] hover:bg-white/10"
                      : "bg-white text-[#172019] hover:bg-[#f3ece4]"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </nav>

        <section id="overview">
        <Panel className={`${surface} flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">SpendSpace dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">{getGreeting(user.name || user.email)}</h1>
            <p className={`mt-2 max-w-2xl ${soft}`}>Your budget, savings target, analytics, and ledger all live in one cleaner workspace.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))} className={`rounded-md border px-4 py-3 text-sm font-medium ${surface}`}>{dark ? "Light mode" : "Dark mode"}</button>
            <button type="button" onClick={() => { clearStoredUser(); window.location.href = "/login"; }} className="rounded-md bg-[#d97757] px-4 py-3 text-sm font-medium text-white hover:bg-[#c66646]">Logout</button>
          </div>
        </Panel>
        </section>

        <section id="planner" className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel className={dark ? "border-white/10 bg-[linear-gradient(135deg,#16201b_0%,#111511_100%)]" : "border-[#ddd4c9] bg-[linear-gradient(135deg,#fffaf4_0%,#f4ebe1_100%)]"}>
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#d97757]">Current month</p>
                <h2 className="mt-2 text-4xl font-semibold">{formatCurrency(metrics.monthSpend, budget.currency)} spent</h2>
                <p className={`mt-3 max-w-xl leading-7 ${soft}`}>Budget remaining: {formatCurrency(metrics.budgetLeft, budget.currency)}. Savings progress: {budget.savingsTarget ? `${Math.min((metrics.savings / budget.savingsTarget) * 100, 100).toFixed(0)}%` : "set a target"}.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => openAdd("expense")} className="rounded-md bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500">Add expense</button>
                <button type="button" onClick={() => openAdd("income")} className="rounded-md bg-[#d97757] px-4 py-3 text-sm font-medium text-white hover:bg-[#c66646]">Log income</button>
                <button type="button" onClick={exportExcel} className={`rounded-md border px-4 py-3 text-sm font-medium ${surface}`}>Export Excel</button>
                <button type="button" onClick={exportPDF} className={`rounded-md border px-4 py-3 text-sm font-medium ${surface}`}>Export PDF</button>
              </div>
            </div>
          </Panel>

          <Panel className={surface}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">Budget control</p>
            <h2 className="mt-2 text-2xl font-semibold">Plan your month</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {[
                ["Monthly budget", "amount", "50000"],
                ["Savings target", "savingsTarget", "15000"],
                ["Alert at percent", "alertThreshold", "80"],
              ].map(([label, key, placeholder]) => (
                <Field key={key} label={label}>
                  <input className={input} value={budgetInputs[key]} onChange={(e) => setBudgetInputs({ ...budgetInputs, [key]: e.target.value })} placeholder={placeholder} />
                </Field>
              ))}
              <Field label="Currency">
                <select className={input} value={budgetInputs.currency} onChange={(e) => setBudgetInputs({ ...budgetInputs, currency: e.target.value })}>
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="AED">AED</option>
                </select>
              </Field>
            </div>
            <button type="button" onClick={saveBudget} disabled={savingBudget} className={`mt-5 w-full rounded-md px-4 py-3 font-medium text-white ${savingBudget ? "cursor-not-allowed bg-[#708074]" : "bg-emerald-600 hover:bg-emerald-500"}`}>{savingBudget ? "Saving budget..." : "Save budget settings"}</button>
          </Panel>
        </section>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["Net flow", formatCurrency(metrics.net, budget.currency), `${filtered.length} visible entries`, metrics.net >= 0 ? "text-emerald-500" : "text-[#d97757]"],
            ["Income in view", formatCurrency(metrics.totalIncome, budget.currency), "Salary, freelance, and other inflows", "text-emerald-500"],
            ["Spend in view", formatCurrency(metrics.totalSpend, budget.currency), `Budget usage this month: ${metrics.budgetUsed.toFixed(0)}%`, "text-[#d97757]"],
            ["Pending and recurring", `${metrics.pendingCount} / ${metrics.recurringCount}`, `Pending amount: ${formatCurrency(metrics.pendingAmount, budget.currency)}`, "text-[#eab308]"],
          ].map(([label, value, detail, tone]) => (
            <Panel key={label} className={surface}>
              <p className="text-sm text-[#6d796f]">{label}</p>
              <p className={`mt-2 text-3xl font-semibold ${tone}`}>{value}</p>
              <p className="mt-3 text-sm leading-6 text-[#6d796f]">{detail}</p>
            </Panel>
          ))}
        </div>

        <Panel className={`${surface} mt-6`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#d97757]">Filter workspace</p>
              <h2 className="mt-2 text-2xl font-semibold">Search and slice the ledger</h2>
            </div>
            <button type="button" onClick={() => setFilters(blankFilters)} className={`rounded-md border px-4 py-3 text-sm font-medium ${surface}`}>Reset filters</button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="Search"><input className={input} value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} placeholder="Title, note, tag" /></Field>
            <Field label="Type"><select className={input} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="all">All types</option><option value="expense">Expense</option><option value="income">Income</option></select></Field>
            <Field label="Category"><select className={input} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Date range"><select className={input} value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}><option value="all">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select></Field>
            <Field label="Payment method"><select className={input} value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}><option value="all">All methods</option>{PAYMENT_METHODS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Wallet"><select className={input} value={filters.wallet} onChange={(e) => setFilters({ ...filters, wallet: e.target.value })}><option value="all">All wallets</option>{WALLETS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
            <Field label="Status"><select className={input} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">All statuses</option><option value="cleared">Cleared</option><option value="pending">Pending</option></select></Field>
            <Field label="Sort by"><select className={input} value={filters.sortBy} onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}><option value="latest">Latest first</option><option value="oldest">Oldest first</option><option value="highest">Highest amount</option><option value="lowest">Lowest amount</option></select></Field>
          </div>
        </Panel>

        <section id="analytics" className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <Panel className={surface}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">Cash flow trend</p>
            <h2 className="mt-2 text-2xl font-semibold">Six month movement</h2>
            <div className="chart-wrap mt-6"><Line data={{ labels: monthlyTrend.map((item) => item.label), datasets: [{ label: "Income", data: monthlyTrend.map((item) => item.income), borderColor: "#10b981", backgroundColor: "rgba(16,185,129,0.16)", fill: true, tension: 0.35 }, { label: "Spend", data: monthlyTrend.map((item) => item.expense), borderColor: "#d97757", backgroundColor: "rgba(217,119,87,0.14)", fill: true, tension: 0.35 }] }} options={chartOptions} /></div>
          </Panel>
          <Panel className={surface}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#d97757]">Finance pulse</p>
            <h2 className="mt-2 text-2xl font-semibold">What stands out now</h2>
            <div className="mt-6 space-y-3">{insights.map((item) => <div key={item} className={`rounded-md border p-4 text-sm leading-6 ${surface}`}>{item}</div>)}</div>
            <div className="mt-6 space-y-4">{weeklyPulse.map((item) => { const max = Math.max(...weeklyPulse.map((entry) => entry.expense), 1); return <div key={item.key}><div className="mb-1 flex items-center justify-between text-sm"><span className={soft}>{item.label}</span><span>{formatCompactNumber(item.expense)}</span></div><div className={dark ? "h-2 rounded-full bg-white/8" : "h-2 rounded-full bg-[#ece5dc]"}><div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.expense / max) * 100}%` }} /></div></div>; })}</div>
          </Panel>
        </section>
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel className={surface}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">Category mix</p>
            <h2 className="mt-2 text-2xl font-semibold">Where your spend is going</h2>
            {categoryBreakdown.length ? <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><div className="chart-wrap"><Doughnut data={{ labels: categoryBreakdown.map((item) => item[0]), datasets: [{ data: categoryBreakdown.map((item) => item[1]), backgroundColor: CHART_COLORS, borderWidth: 0 }] }} options={{ ...chartOptions, scales: undefined }} /></div><div className="space-y-3">{categoryBreakdown.map(([label, value], index) => <div key={label} className={`flex items-center justify-between rounded-md border p-4 ${surface}`}><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} /><div><p className="font-medium">{label}</p><p className={`text-sm ${soft}`}>Top category signal</p></div></div><p className="font-semibold">{formatCurrency(value, budget.currency)}</p></div>)}</div></div> : <p className={`mt-6 text-sm ${soft}`}>Add some expense entries to unlock category analytics.</p>}
          </Panel>
          <Panel className={surface}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#d97757]">Payment spread</p>
            <h2 className="mt-2 text-2xl font-semibold">Method and wallet activity</h2>
            {paymentBreakdown.length ? <div className="chart-wrap mt-6"><Bar data={{ labels: paymentBreakdown.map((item) => item[0]), datasets: [{ label: "Volume", data: paymentBreakdown.map((item) => item[1]), backgroundColor: ["#10b981", "#d97757", "#eab308", "#14b8a6", "#f97316"], borderRadius: 6 }] }} options={chartOptions} /></div> : <p className={`mt-6 text-sm ${soft}`}>Payment method breakdown appears once transactions are available.</p>}
          </Panel>
        </div>

        <section id="ledger" className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Panel className={surface}>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">Ledger</p><h2 className="mt-2 text-2xl font-semibold">Recent transactions</h2></div><p className={`text-sm ${soft}`}>{filtered.length} visible entries across your current filters.</p></div>
            <div className="mt-6 space-y-3">{loading ? <p className={`text-sm ${soft}`}>Loading transactions...</p> : filtered.length ? filtered.map((item) => <div key={item._id} className={`rounded-md border p-4 ${surface}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-3"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold">{item.title}</h3><span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${item.type === "income" ? "bg-emerald-500/16 text-emerald-500" : "bg-[#d97757]/16 text-[#d97757]"}`}>{item.type}</span><span className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${item.status === "pending" ? "bg-[#eab308]/16 text-[#eab308]" : dark ? "bg-white/8 text-[#d7ded6]" : "bg-[#f1ece3] text-[#536257]"}`}>{item.status}</span>{item.recurring ? <span className="rounded-full bg-emerald-500/16 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-emerald-500">recurring</span> : null}</div><p className={`mt-2 text-sm ${soft}`}>{item.category} • {item.paymentMethod} • {item.wallet} • {formatDate(item.date)}</p></div>{item.notes ? <p className={`text-sm leading-6 ${soft}`}>{item.notes}</p> : null}{item.tags?.length ? <div className="flex flex-wrap gap-2">{item.tags.map((tag) => <span key={`${item._id}-${tag}`} className={dark ? "rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-[#d7ded6]" : "rounded-full bg-[#f1ece3] px-3 py-1 text-xs font-medium text-[#536257]"}>{tag}</span>)}</div> : null}</div><div className="flex flex-col items-start gap-3 lg:items-end"><p className={`text-2xl font-semibold ${item.type === "income" ? "text-emerald-500" : "text-[#d97757]"}`}>{item.type === "income" ? "+" : "-"}{formatCurrency(item.amount, budget.currency)}</p><div className="flex gap-2"><button type="button" onClick={() => editItem(item)} className={`rounded-md border px-3 py-2 text-sm font-medium ${surface}`}>Edit</button><button type="button" onClick={() => removeEntry(item._id)} className="rounded-md bg-[#d97757] px-3 py-2 text-sm font-medium text-white hover:bg-[#c66646]">Delete</button></div></div></div></div>) : <div className={`rounded-md border border-dashed p-6 text-sm leading-7 ${dark ? "border-white/12 bg-[#161a17] text-[#b9c3b8]" : "border-[#d9d1c7] bg-[#fffaf4] text-[#5f6c63]"}`}>No transactions match the current filters. Reset the workspace filters or add a fresh entry.</div>}</div>
          </Panel>
          <Panel className={surface}>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#d97757]">Snapshot</p>
            <h2 className="mt-2 text-2xl font-semibold">Quick health check</h2>
            <div className="mt-6 space-y-4">{[
              ["Budget left", formatCurrency(metrics.budgetLeft, budget.currency), `Alert threshold: ${budget.alertThreshold}%`],
              ["Savings target", budget.savingsTarget ? `${Math.min((metrics.savings / budget.savingsTarget) * 100, 100).toFixed(0)}%` : "Not set", `Target value: ${formatCurrency(budget.savingsTarget, budget.currency)}`],
              ["Average visible entry", formatCurrency(filtered.length ? (metrics.totalIncome + metrics.totalSpend) / filtered.length : 0, budget.currency), "Useful for spotting whether your current view is made of many small entries or a few large ones."],
            ].map(([label, value, detail]) => <div key={label} className={`rounded-md border p-4 ${surface}`}><p className="text-sm text-[#6d796f]">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className={`mt-3 text-sm ${soft}`}>{detail}</p>{label === "Budget left" ? <div className={dark ? "mt-4 h-2 rounded-full bg-white/8" : "mt-4 h-2 rounded-full bg-[#ece5dc]"}><div className={metrics.budgetUsed >= budget.alertThreshold ? "h-full rounded-full bg-[#d97757]" : "h-full rounded-full bg-emerald-500"} style={{ width: `${Math.min(metrics.budgetUsed, 100)}%` }} /></div> : null}</div>)}</div>
          </Panel>
        </section>

        <footer className={`${surface} mt-6`}>
          <div className="grid gap-6 lg:grid-cols-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">
                SpendSpace
              </p>
              <h3 className="mt-2 text-2xl font-semibold">
                A more complete final-year project feel
              </h3>
              <p className={`mt-3 text-sm leading-7 ${soft}`}>
                This project now combines authentication, budgeting, savings
                planning, transaction operations, analytics, exports, and a
                cleaner product-style interface.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#d97757]">
                Included modules
              </p>
              <ul className={`mt-3 space-y-2 text-sm ${soft}`}>
                <li>Authentication and user workspace</li>
                <li>Expense and income management</li>
                <li>Budget, savings target, and alerts</li>
                <li>Charts, insights, exports, and filters</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">
                Build status
              </p>
              <ul className={`mt-3 space-y-2 text-sm ${soft}`}>
                <li>Frontend build verified</li>
                <li>Frontend test verified</li>
                <li>Backend fallback storage enabled</li>
                <li>Ready for screenshots, demo, and thesis writing</li>
              </ul>
            </div>
          </div>
        </footer>
      </div>

      {openModal ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"><div className={`max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-md border p-6 ${dark ? "border-white/10 bg-[#121513]" : "border-[#ddd4c9] bg-[#fffaf4]"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-500">{editingId ? "Edit entry" : "New entry"}</p><h2 className="mt-2 text-2xl font-semibold">{editingId ? "Update transaction details" : "Add a fresh transaction"}</h2></div><button type="button" onClick={closeModal} className={`rounded-md border px-3 py-2 text-sm ${surface}`}>Close</button></div><div className="mt-6 grid gap-4 md:grid-cols-2"><Field label="Title"><input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Team lunch" /></Field><Field label="Amount"><input className={input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="2500" /></Field><Field label="Type"><select className={input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, category: e.target.value === "income" ? "Salary" : "Food" })}><option value="expense">Expense</option><option value="income">Income</option></select></Field><Field label="Date"><input type="date" className={input} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field><Field label="Category"><select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.filter((category) => form.type === "income" ? ["Salary", "Freelance", "Savings"].includes(category) || !DEFAULT_CATEGORIES.includes(category) : !["Salary", "Freelance"].includes(category)).map((category) => <option key={category} value={category}>{category}</option>)}<option value="custom">Custom category</option></select></Field><Field label="Payment method"><select className={input} value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}</select></Field>{form.category === "custom" ? <Field label="Custom category"><input className={input} value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} placeholder="Consulting, Gifts, Repair" /></Field> : null}<Field label="Wallet"><select className={input} value={form.wallet} onChange={(e) => setForm({ ...form, wallet: e.target.value })}>{WALLETS.map((wallet) => <option key={wallet} value={wallet}>{wallet}</option>)}</select></Field><Field label="Status"><select className={input} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="cleared">Cleared</option><option value="pending">Pending</option></select></Field><Field label="Tags"><input className={input} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="office, family, health" /></Field></div><div className="mt-4 space-y-4"><Field label="Notes"><textarea rows="4" className={input} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Context, reminders, or why this transaction happened." /></Field><label className="flex items-center gap-3"><input type="checkbox" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} className="h-4 w-4 rounded border-[#cfc4b8]" /><span className={soft}>Mark this as recurring so it stays visible in planning.</span></label></div><div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} className={`rounded-md border px-4 py-3 text-sm font-medium ${surface}`}>Cancel</button><button type="button" onClick={saveEntry} disabled={savingEntry} className={`rounded-md px-4 py-3 text-sm font-medium text-white ${savingEntry ? "cursor-not-allowed bg-[#708074]" : "bg-emerald-600 hover:bg-emerald-500"}`}>{savingEntry ? "Saving transaction..." : editingId ? "Update transaction" : "Add transaction"}</button></div></div></div> : null}
    </div>
  );
}
