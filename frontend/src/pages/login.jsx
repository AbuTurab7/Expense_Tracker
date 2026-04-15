import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

export default function Login() {
  const [data, setData] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const nav = useNavigate();
   const baseURL = process.env.REACT_APP_API_URL;

  const login = async () => {
    try {
      const res = await axios.post(
        `http://${baseURL}/api/auth/login`,
        data
      );

      if (res.data._id) {
        localStorage.setItem("user", JSON.stringify(res.data));
        toast.success("Login successful 🎉");
        setTimeout(() => nav("/dashboard"), 1000);
      } else {
        toast.error("Invalid credentials");
      }
    } catch {
      toast.error("Login failed");
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
    <div className={`flex h-screen items-center justify-center ${theme}`}>
      <Toaster position="top-center" />

      <div className={`w-[320px] p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${card}`}>

        {/* Toggle */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="text-sm px-2 py-1 rounded  text-white"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>

        <h2 className="text-2xl font-semibold mb-5 text-center">
          Welcome Back 👋
        </h2>

        {/* Email */}
        <input
          className={`w-full p-2 mb-3 rounded border ${inputStyle}`}
          placeholder="Email"
          onChange={(e) =>
            setData({ ...data, email: e.target.value })
          }
        />

        {/* Password */}
        <div className="relative mb-4">
          <input
            type={showPassword ? "text" : "password"}
            className={`w-full p-2 rounded border ${inputStyle}`}
            placeholder="Password"
            onChange={(e) =>
              setData({ ...data, password: e.target.value })
            }
          />

          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 cursor-pointer text-sm opacity-70"
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        <button
          onClick={login}
          className="w-full bg-indigo-500 hover:bg-indigo-600 transition p-2 rounded text-white font-medium"
        >
          Login
        </button>

        <p className="text-center mt-4 text-sm opacity-70">
          Don’t have an account?{" "}
          <span
            onClick={() => nav("/")}
            className="text-indigo-400 cursor-pointer"
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}
