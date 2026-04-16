import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./pages/login.jsx";
import Register from "./pages/registration.jsx";
import Dashboard from "./pages/dashboard.jsx";
import { getStoredUser } from "./utils/app";

function HomeRedirect() {
  const user = getStoredUser();
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function ProtectedRoute({ children }) {
  const user = getStoredUser();
  return user ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const user = getStoredUser();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: "8px",
            background: "#172019",
            color: "#f7f3ec",
            border: "1px solid rgba(255,255,255,0.12)",
          },
        }}
      />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
