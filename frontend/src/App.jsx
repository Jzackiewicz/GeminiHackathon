import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import GitHubCallback from "./pages/GitHubCallback";
import Dashboard from "./pages/Dashboard";
import Interview from "./pages/Interview";
import JobDetail from "./pages/JobDetail";
import Debug from "./pages/Debug";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/github/callback" element={<GitHubCallback />} />
      <Route path="/debug" element={<Debug />} />
      <Route
        path="/job/:id"
        element={
          <PrivateRoute>
            <JobDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/interview"
        element={
          <PrivateRoute>
            <Interview />
          </PrivateRoute>
        }
      />
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
