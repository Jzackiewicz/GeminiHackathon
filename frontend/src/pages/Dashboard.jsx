import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import DashboardLayout from "../components/dashboard/DashboardLayout";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
    api.getProfile().then(setProfile).catch(() => {});
  }, [navigate]);

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <DashboardLayout
      user={user}
      profile={profile}
      onUpdateProfile={setProfile}
      onLogout={logout}
    />
  );
}
