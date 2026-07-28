import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, getSession, setSession } from "./api.js";
import Login from "./pages/Login.jsx";
import Calendar from "./pages/Calendar.jsx";
import Availability from "./pages/Availability.jsx";
import Offers from "./pages/Offers.jsx";
import Admin from "./pages/Admin.jsx";
import Avatar from "./components/Avatar.jsx";
import { LogoMark, OrgLogo, hasOrgLogo, orgTheme } from "./components/Logo.jsx";
import { InstallLink, useInstall, IOSInstallSheet } from "./components/InstallPrompt.jsx";

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

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="8" cy="12" r="4" /><path d="M12 12h9m-3 0v3m-2-3v2" />
  </svg>
);
const InstallIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="2" width="12" height="20" rx="3" /><path d="M12 6v7m0 0-2.5-2.5M12 13l2.5-2.5" />
  </svg>
);
const OutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 17v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v2" />
    <path d="M20 12H10m10 0-3-3m3 3-3 3" />
  </svg>
);

function ChangePinModal({ onClose, notify }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = () => {
    if (!/^\d{4}$/.test(pin)) return notify("PIN must be exactly 4 digits.", "error");
    if (pin !== confirm) return notify("PINs don't match.", "error");
    setBusy(true);
    api("/change-pin", { method: "POST", body: { pin } })
      .then(() => {
        notify("PIN updated. Use it next time you sign in.", "success");
        onClose();
      })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  return createPortal(
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
    </div>,
    document.body,
  );
}

/** The account menu behind the avatar in the mobile app bar. */
function AccountSheet({ session, onClose, onChangePin, onLogout }) {
  const { available, canPrompt, install } = useInstall();
  const [showIOS, setShowIOS] = useState(false);

  return createPortal(
    <>
      <div className="modal-back" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="grab" />
          <div className="acct-head">
            <Avatar name={session.staff.name} size="lg" />
            <div>
              <div className="nm">{session.staff.name}</div>
              <div className="rl">
                {session.staff.isAdmin ? "Administrator" : "Staff"}
                {session.org?.name ? ` · ${session.org.name}` : ""}
              </div>
            </div>
          </div>
          <div className="acct-sheet">
            <button className="acct-item" onClick={() => { onClose(); onChangePin(); }}>
              <KeyIcon /> Change my PIN
            </button>
            {available && (
              <button
                className="acct-item"
                onClick={() => (canPrompt ? install().then(onClose) : setShowIOS(true))}
              >
                <InstallIcon /> Install on this phone
              </button>
            )}
            <button className="acct-item danger" onClick={onLogout}>
              <OutIcon /> Sign out
            </button>
          </div>
        </div>
      </div>
      {showIOS && <IOSInstallSheet onClose={() => { setShowIOS(false); onClose(); }} />}
    </>,
    document.body,
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
  const [showAccount, setShowAccount] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.type === "error" ? 4200 : 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Dress the whole app in the workplace's palette, so a signed-in clinic sees
  // its own colours rather than the platform's.
  const orgSlug = session?.org?.slug;
  useEffect(() => {
    const theme = orgTheme(orgSlug);
    if (theme) document.documentElement.setAttribute("data-org", theme);
    else document.documentElement.removeAttribute("data-org");
  }, [orgSlug]);

  // notify(msg) or notify(msg, "error" | "success" | "info")
  const notify = (msg, type = "info") => setToast((prev) => ({ msg, type, id: (prev?.id ?? 0) + 1 }));

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

  const branded = hasOrgLogo(session.org?.slug);
  const tabs = [
    { id: "calendar", label: "Calendar" },
    { id: "availability", label: "Availability" },
    { id: "offers", label: "Offers" },
    ...(session.staff.isAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];

  return (
    <div className="app">
      <aside className="sidenav">
        {branded ? (
          <div className="side-brand branded">
            <div className="org-logo-tile"><OrgLogo slug={session.org.slug} /></div>
            <span className="brand-platform">Roster<b>ME</b></span>
          </div>
        ) : (
          <div className="side-brand">
            <span className="mark"><LogoMark size={38} idSuffix="-nav" /></span>
            <span className="brand-text">
              <span className="brand-org">{session.org?.name ?? "RosterME"}</span>
              <span className="brand-platform">Roster<b>ME</b></span>
            </span>
          </div>
        )}
        <nav className="side-links">
          {tabs.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              {ICONS[t.id](tab === t.id)}
              {t.label}
            </button>
          ))}
        </nav>
        <InstallLink className="side-install" />
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

      {/* Phones get no sidebar, so the workplace identity and account menu
          live here instead. */}
      <header className="appbar">
        <div className="ab-logo">
          {branded ? (
            <span className="ab-org-logo"><OrgLogo slug={session.org.slug} variant="compact" /></span>
          ) : (
            <span className="ab-lockup">
              <LogoMark size={30} idSuffix="-bar" />
              <span className="nm">{session.org?.name ?? "RosterME"}</span>
            </span>
          )}
        </div>
        <button className="ab-me" onClick={() => setShowAccount(true)} aria-label="Account and settings">
          <Avatar name={session.staff.name} size="sm" />
        </button>
      </header>

      <main className="main">
        {tab === "calendar" && <Calendar me={session.staff} notify={notify} />}
        {tab === "availability" && <Availability me={session.staff} notify={notify} />}
        {tab === "offers" && <Offers me={session.staff} notify={notify} />}
        {tab === "admin" && session.staff.isAdmin && (
          <Admin me={session.staff} notify={notify} onLogout={logout} />
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

      {showAccount && (
        <AccountSheet
          session={session}
          onClose={() => setShowAccount(false)}
          onChangePin={() => setShowPin(true)}
          onLogout={logout}
        />
      )}
      {showPin && <ChangePinModal onClose={() => setShowPin(false)} notify={notify} />}
      {toast && (
        <div className={`toast ${toast.type}`} key={toast.id} role="status">
          <span className="toast-ic" aria-hidden="true">
            {toast.type === "error" ? "!" : toast.type === "success" ? "✓" : "i"}
          </span>
          <span className="toast-msg">{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
