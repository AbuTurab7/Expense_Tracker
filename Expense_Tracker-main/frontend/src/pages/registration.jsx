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

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
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

  const registerUser = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.name || !form.email || !form.password || !form.confirmPassword) {
      toast.error("Please complete the full form.");
      return;
    }

    if (!emailRegex.test(form.email)) {
      toast.error("Please enter a valid email address.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      };

      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, payload);
      setStoredUser(res.data.user);
      toast.success("Workspace ready.");
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full rounded-md border px-4 py-3 outline-none transition ${
    darkMode
      ? "border-white/10 bg-[#171b18] text-[#f7f3ec] placeholder:text-[#8b978d] focus:border-[#e28e5a]"
      : "border-[#d9d1c7] bg-white text-[#172019] placeholder:text-[#6a766d] focus:border-[#d97757]"
  }`;

  return (
    <AuthShell
      theme={theme}
      onThemeToggle={toggleTheme}
      badge="A sharper finance workspace"
      title="Set up a money system you will actually enjoy using."
      subtitle="Start with a clean dashboard, smarter entries, monthly planning, and reports that make your finances easier to review."
      imageUrl="https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1400&q=80"
      highlights={[
        {
          label: "Richer records",
          value: "Track context",
          detail: "Save title, category, method, wallet, tags, status, notes, and recurring flags for every entry.",
        },
        {
          label: "Monthly plan",
          value: "Budget with goals",
          detail: "Set a budget, savings target, and alert point so the dashboard starts guiding your decisions.",
        },
        {
          label: "Analytics",
          value: "See the pattern",
          detail: "Watch six-month movement, category mix, payment method spread, and short-term activity.",
        },
        {
          label: "Operations",
          value: "Easy exports",
          detail: "Keep filtered views ready for Excel and PDF without rebuilding the report outside the app.",
        },
      ]}
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-[#d97757]">
            Sign in instead
          </Link>
        </p>
      }
    >
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-[#d97757]">
          Register
        </p>
        <h2 className="text-3xl font-semibold">Create your finance workspace</h2>
        <p className={darkMode ? "text-[#b9c3b8]" : "text-[#59675d]"}>
          A few details now, and the dashboard is ready right after signup.
        </p>
      </div>

      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) registerUser();
        }}
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium">Full name</span>
          <input
            type="text"
            className={inputClass}
            placeholder="Azeem Khan"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input
            type="email"
            className={inputClass}
            placeholder="you@example.com"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className={`${inputClass} pr-28`}
              placeholder="Create password"
              value={form.password}
              onChange={(event) =>
                setForm({ ...form, password: event.target.value })
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

        <label className="block space-y-2">
          <span className="text-sm font-medium">Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            className={inputClass}
            placeholder="Repeat password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm({ ...form, confirmPassword: event.target.value })
            }
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-md px-4 py-3 font-medium text-white transition ${
            loading
              ? "cursor-not-allowed bg-[#7c736a]"
              : "bg-[#d97757] hover:bg-[#c66646]"
          }`}
        >
          {loading ? "Creating workspace..." : "Create account"}
        </button>
      </form>
    </AuthShell>
  );
}
