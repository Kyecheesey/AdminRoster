import React, { useEffect, useState } from "react";
import { getSession, setSession } from "./api.js";
import Login from "./pages/Login.jsx";
import Calendar from "./pages/Calendar.jsx";
import Availability from "./pages/Availability.jsx";
import Offers from "./pages/Offers.jsx";
import Admin from "./pages/Admin.jsx";

const ICONS = {
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  ),
  availability: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  offers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
    </svg>
  ),
  admin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  ),
};

export default function App() {
  const [session, setSess] = useState(getSession());
  const [tab, setTab] = useState("calendar");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (msg) => setToast(msg);

  if (!session) {
    return (
      <Login
        onLogin={(s) => {
          setSession(s);
          setSess(s);
        }}
      />
    );
  }

  const logout = () => {
    setSession(null);
    setSess(null);
  };

  const tabs = [
    { id: "calendar", label: "Calendar" },
    { id: "availability", label: "Availability" },
    { id: "offers", label: "Offers" },
    ...(session.staff.isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  return (
    <div className="app">
      {tab === "calendar" && <Calendar me={session.staff} notify={notify} />}
      {tab === "availability" && <Availability me={session.staff} notify={notify} />}
      {tab === "offers" && <Offers me={session.staff} notify={notify} />}
      {tab === "admin" && session.staff.isAdmin && (
        <Admin me={session.staff} notify={notify} onLogout={logout} />
      )}
      {tab !== "admin" && (
        <div style={{ textAlign: "center", paddingBottom: 12 }}>
          <button className="link-btn" style={{ color: "#7a7f8c", background: "none", border: "none", fontSize: 13, cursor: "pointer" }} onClick={logout}>
            Signed in as {session.staff.name} — Sign out
          </button>
        </div>
      )}
      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            {ICONS[t.id]}
            {t.label}
          </button>
        ))}
      </nav>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
