import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken } from "../api";
import DashboardLayout from "../components/dashboard/DashboardLayout";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();
  const autoScanTriggered = useRef(false);

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      clearToken();
      navigate("/login");
    });
    api.getProfile().then(setProfile).catch(() => {});
  }, [navigate]);

  // Auto-scan: if profile has github_username but no analysis yet, trigger it
  useEffect(() => {
    if (!profile || autoScanTriggered.current) return;
    if (profile.github_username && !profile.primary_role) {
      autoScanTriggered.current = true;
      autoScan();
    }
  }, [profile]);

  async function autoScan() {
    setScanning(true);
    try {
      await api.rescanProfile();
      // Poll until analysis completes
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 3000));
        const updated = await api.getProfile();
        if (updated.primary_role) {
          setProfile(updated);
          setScanning(false);
          return;
        }
      }
    } catch {
      // silently fail — user can manually rescan
    }
    setScanning(false);
  }

  function logout() {
    clearToken();
    navigate("/login");
  }

  return (
    <DashboardLayout
      user={user}
      profile={profile}
      scanning={scanning}
      onUpdateProfile={setProfile}
      onLogout={logout}
    />
  );
}
