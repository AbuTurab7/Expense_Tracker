import { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

export default function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [darkMode, setDarkMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

   const baseURL = process.env.REACT_APP_API_URL;
  // const baseURL = `http://localhost:5000`;

  const registerUser = async () => {
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }

    if (!emailRegex.test(form.email)) {
      toast.error("Invalid email format");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      await axios.post(`${baseURL}/api/auth/register`, form);

      toast.success("Registered Successfully ✅");

      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  const theme = darkMode
    ? "bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white"
    : "bg-gradient-to-br from-gray-100 to-white text-gray-900";

  const card = darkMode
    ? "bg-white/10 border-white/20"
    : "bg-white/80 border-gray-200";

  const inputStyle = darkMode
    ? "bg-gray-800 text-white border-gray-700 placeholder-gray-400"
    : "bg-white text-gray-900 border-gray-300";

  return (
    <div className={`flex items-center justify-center h-screen ${theme}`}>
      <Toaster position="top-center" />

      <div className={`w-[320px] p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${card}`}>
        
        {/* Theme Toggle */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-sm px-2 py-1 rounded text-white"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <h2 className="text-2xl font-semibold text-center mb-5">
          Create Account ✨
        </h2>

        {/* FORM START */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!loading) registerUser();
          }}
        >
          {/* Email */}
          <input
            type="email"
            className={`w-full p-2 mb-3 rounded border ${inputStyle}`}
            placeholder="Enter Email"
            value={form.email}
            required
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />

          {/* Password */}
          <div className="relative mb-4">
            <input
              type={showPassword ? "text" : "password"}
              className={`w-full p-2 rounded border ${inputStyle}`}
              placeholder="Enter Password"
              value={form.password}
              required
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2 cursor-pointer text-sm opacity-70"
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full p-2 rounded text-white font-medium transition ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-indigo-500 hover:bg-indigo-600"
            }`}
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </form>
        {/* FORM END */}

        <p className="text-center mt-4 text-sm opacity-70">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-400">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
