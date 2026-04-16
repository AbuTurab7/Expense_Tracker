import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import AuthShell from "../components/AuthShell.jsx";
import {
  API_BASE_URL,
  getStoredTheme,
  setStoredTheme,
  setStoredUser,
} from "../utils/app";

export default function Login() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  const [theme, setTheme] = useState(getStoredTheme());
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const darkMode = theme === "dark";

  const toggleTheme = () => {
    const nextTheme = darkMode ? "light" : "dark";
    setTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  const login = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!credentials.email || !credentials.password) {
      toast.error("Please fill in your email and password.");
      return;
    }

    if (!emailRegex.test(credentials.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, credentials);

      setStoredUser(res.data);
      toast.success("Welcome back.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full rounded-md border px-4 py-3 outline-none transition ${
    darkMode
      ? "border-white/10 bg-[#171b18] text-[#f7f3ec] placeholder:text-[#8b978d] focus:border-emerald-400/60"
      : "border-[#d9d1c7] bg-white text-[#172019] placeholder:text-[#6a766d] focus:border-emerald-600/60"
  }`;

  return (
    <AuthShell
      theme={theme}
      onThemeToggle={toggleTheme}
      badge="Focused money ops"
      title="Come back to a cleaner view of your money."
      subtitle="Track spending, spot patterns, and keep your monthly plan under control without digging through messy notes."
      imageUrl="https://images.unsplash.com/photo-1554224154-26032fced8bd?auto=format&fit=crop&w=1400&q=80"
      highlights={[
        {
          label: "This setup",
          value: "Planner + tracker",
          detail: "Monthly budget, savings target, analytics, and rich transaction records live together.",
        },
        {
          label: "Daily workflow",
          value: "Fast updates",
          detail: "Log entries with tags, wallet, payment method, status, and recurring markers in one pass.",
        },
        {
          label: "Decision support",
          value: "Clear signals",
          detail: "See budget pressure, top categories, pending items, and multi-month trends at a glance.",
        },
        {
          label: "Exports",
          value: "Ready to share",
          detail: "Generate Excel and PDF snapshots whenever you need a review outside the app.",
        },
      ]}
      footer={
        <p>
          New here?{" "}
          <Link to="/register" className="font-medium text-emerald-500">
            Create your workspace
          </Link>
        </p>
      }
    >
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-500">
          Login
        </p>
        <h2 className="text-3xl font-semibold">Continue from where you left off</h2>
        <p className={darkMode ? "text-[#b9c3b8]" : "text-[#59675d]"}>
          Use the account you already created. Your dashboard will open right away.
        </p>
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) login();
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className={inputClass}
            placeholder="you@example.com"
            value={credentials.email}
            onChange={(event) =>
              setCredentials({ ...credentials, email: event.target.value })
            }
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className={`${inputClass} pr-28`}
              placeholder="Enter password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials({ ...credentials, password: event.target.value })
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-sm ${
                darkMode ? "text-[#d8dfd6]" : "text-[#415145]"
              }`}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-md px-4 py-3 font-medium text-white transition ${
            loading
              ? "cursor-not-allowed bg-[#6d776f]"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {loading ? "Logging in..." : "Open dashboard"}
        </button>
      </form>
    </AuthShell>
  );
}
