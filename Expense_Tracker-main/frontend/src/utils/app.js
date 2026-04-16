export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000";

const USER_KEY = "expense-tracker-user";
const THEME_KEY = "expense-tracker-theme";

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem("user");
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?._id) {
      return parsed;
    }
  } catch (error) {
    console.error("Failed to read stored user", error);
  }

  return null;
};

export const setStoredUser = (user) => {
  if (!user?._id) return;

  const serialized = JSON.stringify(user);
  localStorage.setItem(USER_KEY, serialized);
  localStorage.setItem("user", serialized);
};

export const clearStoredUser = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("user");
};

export const getStoredTheme = () => {
  const theme = localStorage.getItem(THEME_KEY);
  return theme === "light" ? "light" : "dark";
};

export const setStoredTheme = (theme) => {
  localStorage.setItem(THEME_KEY, theme === "light" ? "light" : "dark");
};

export const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatCompactNumber = (value) =>
  new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));

export const formatDate = (value, options = {}) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  });
};

export const toInputDate = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
};

export const getGreeting = (name = "there") => {
  const hour = new Date().getHours();
  const firstName = name.trim().split(" ")[0] || "there";

  if (hour < 12) return `Good morning, ${firstName}`;
  if (hour < 18) return `Good afternoon, ${firstName}`;
  return `Good evening, ${firstName}`;
};
