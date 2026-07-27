import React, { useEffect, useState } from "react";
import { api, getSession, setSession } from "./api.js";
import Login from "./pages/Login.jsx";
import Calendar from "./pages/Calendar.jsx";
import Availability from "./pages/Availability.jsx";
import Offers from "./pages/Offers.jsx";
import Admin from "./pages/Admin.jsx";
import Avatar from "./components/Avatar.jsx";
import { LogoMark } from "./components/Logo.jsx";

const ICONS = {
  calendar: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="3" y="5" width="18" height="16" rx="3" fillOpacity={active ? 0.15 : 0} />
      <path d="M3 9.5h18M8 3v4M16 3v4" fill="none" />
    </svg>
  ),
  availability: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" fillOpacity={active ? 0.15 : 0} />
      <path d="M12 7v5l3.2 3.2" fill="none" />
    </svg>
  ),
  offers: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d="M7 10 3.5 13.5 7 17M17 7l3.5 3.5L17 14" fill="none" />
      <path d="M3.5 13.5H14M20.5 10.5H10" fill="none" />
    </svg>
  ),
  admin: (active) => (
    <svg viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" fillOpacity={active ? 0.15 : 0} />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" fill="none" />
    </svg>
  ),
};

function ChangePinModal({ onClose, notify }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!/^\d{4}$/.test(pin)) return notify("PIN must be exactly 4 digits.");
    if (pin !== confirm) return notify("PINs don't match.");
    setBusy(true);
    api("/change-pin", { method: "POST", body: { pin } })
      .then(() => {
        notify("PIN updated. Use it next time you sign in.");
        onClose();
      })
      .catch((e) => notify(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <h2>Change my PIN</h2>
        <div className="row">
          <input
            type="password" inputMode="numeric" maxLength={4} placeholder="New 4-digit PIN"
            value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          <input
            type="password" inputMode="numeric" maxLength={4} placeholder="Repeat PIN"
            value={confirm} onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Update PIN"}
          </button>
          <button className="btn secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSess] = useState(() => {
    // sessions issued before multi-org lack org context; force a clean re-login
    const s = getSession();
    if (s && !s.org) { setSession(null); return null; }
    return s;
  });
  const [tab, setTab] = useState("calendar");
  const [toast, setToast] = useState(null);
  const [showPin, setShowPin] = useState(false);

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
      <aside className="sidenav">
        <div className="side-brand">
          <span className="mark"><LogoMark size={38} idSuffix="-nav" /></span>
          <span className="brand-text">
            <span className="brand-org">{session.org?.name ?? "RosterME"}</span>
            <span className="brand-platform">Roster<b>ME</b></span>
          </span>
        </div>
        <nav className="side-links">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              {ICONS[t.id](tab === t.id)}
              {t.label}
            </button>
          ))}
        </nav>
        <div className="side-user">
          <Avatar name={session.staff.name} size="sm" />
          <div className="who">
            <div className="nm">{session.staff.name}</div>
            <button onClick={() => setShowPin(true)}>Change PIN</button>
            {" · "}
            <button onClick={logout}>Sign out</button>
          </div>
        </div>
      </aside>

      <main className="main">
        {tab === "calendar" && <Calendar me={session.staff} notify={notify} />}
        {tab === "availability" && <Availability me={session.staff} notify={notify} />}
        {tab === "offers" && <Offers me={session.staff} notify={notify} />}
        {tab === "admin" && session.staff.isAdmin && (
          <Admin me={session.staff} notify={notify} onLogout={logout} />
        )}
        {tab !== "admin" && (
          <div className="footer-note">
            <button onClick={() => setShowPin(true)}>Change PIN</button>
            <button onClick={logout}>Signed in as {session.staff.name} · Sign out</button>
          </div>
        )}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
            <span className="tab-ic">{ICONS[t.id](tab === t.id)}</span>
            {t.label}
          </button>
        ))}
      </nav>
      {showPin && <ChangePinModal onClose={() => setShowPin(false)} notify={notify} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
