import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";
import { LogoMark, OrgLogo, hasOrgLogo, orgTheme } from "../components/Logo.jsx";
import { InstallBanner } from "../components/InstallPrompt.jsx";
import { AlertIcon, BackspaceIcon } from "../components/Icons.jsx";

function Banner({ error }) {
  if (!error) return <div className="login-status" />;
  return (
    <div className="login-error" role="alert">
      <span className="le-ic"><AlertIcon size={15} /></span>
      <span>{error}</span>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [org, setOrg] = useState(null);          // resolved workplace
  const [checking, setChecking] = useState(true); // trying to auto-resolve by domain
  const [entry, setEntry] = useState("");          // typed domain / code
  const [staff, setStaff] = useState(null);        // staff for the workplace
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 1. try to resolve the workplace from the current domain; otherwise ask for it
  useEffect(() => {
    api(`/resolve-org?q=${encodeURIComponent(window.location.hostname)}`)
      .then((d) => setOrg(d.org))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  // the sign-in screen already wears the workplace's colours, before anyone
  // has typed a PIN
  useEffect(() => {
    const theme = orgTheme(org?.slug);
    if (theme) document.documentElement.setAttribute("data-org", theme);
    else document.documentElement.removeAttribute("data-org");
  }, [org]);

  // 2. once a workplace is known, load its staff
  useEffect(() => {
    if (!org) return;
    setStaff(null);
    api(`/bootstrap?org=${encodeURIComponent(org.slug)}`)
      .then((d) => setStaff(d.staff))
      .catch(() => setError("Could not load the staff list. Check your connection."));
  }, [org]);

  // 3. auto-submit the PIN on the 4th digit
  useEffect(() => {
    if (pin.length !== 4 || !picked || busy) return;
    setBusy(true);
    api("/login", { method: "POST", body: { staffId: picked.id, pin, org: org?.slug } })
      .then((d) => onLogin(d))
      .catch((e) => {
        setError(e.message);
        setPin("");
      })
      .finally(() => setBusy(false));
  }, [pin, picked, busy, onLogin, org]);

  const resolveEntry = () => {
    const q = entry.trim();
    if (!q) return setError("Enter your workplace domain or code.");
    setBusy(true);
    setError("");
    api(`/resolve-org?q=${encodeURIComponent(q)}`)
      .then((d) => setOrg(d.org))
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  };

  const press = (d) => {
    setError("");
    if (pin.length < 4) setPin(pin + d);
  };

  const Wordmark = () => (
    <>
      <div className="brandmark"><LogoMark size={72} idSuffix="-login" /></div>
      <h1 className="wordmark">Roster<span>ME</span></h1>
    </>
  );

  // --- step A: enter the workplace domain / code ---
  if (!org) {
    return (
      <div className="login">
        <Wordmark />
        <p className="subtitle">Sign in to your workplace</p>
        <div className="org-entry">
          <label className="entry-label">Workplace domain or code</label>
          <input
            className="entry-input"
            type="text"
            inputMode="url"
            autoFocus
            placeholder="e.g. yourclinic.rosterme.app"
            value={entry}
            disabled={checking}
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") resolveEntry(); }}
          />
          <button className="entry-go" onClick={resolveEntry} disabled={busy || checking}>
            {checking ? "Checking…" : busy ? "Finding…" : "Continue"}
          </button>
          <p className="entry-hint">Enter the web address your organisation uses, or its short code.</p>
        </div>
        <Banner error={error} />
      </div>
    );
  }

  // --- step B: choose who's signing in ---
  if (!picked) {
    return (
      <div className="login">
        {hasOrgLogo(org.slug) ? (
          <div className="login-org-logo"><OrgLogo slug={org.slug} /></div>
        ) : (
          <Wordmark />
        )}
        <p className="org-context">
          {!hasOrgLogo(org.slug) && <span className="org-badge sm">{(org.short_name || org.name).slice(0, 3)}</span>}
          {org.name}
          <button className="switch-org" onClick={() => { setOrg(null); setStaff(null); setEntry(""); setError(""); }}>
            Change
          </button>
        </p>
        <p className="subtitle">Who's signing in?</p>
        <div className="name-grid">
          {staff === null && <p className="load-note">Loading…</p>}
          {staff?.length === 0 && <p className="load-note">No staff set up for this workplace yet.</p>}
          {staff?.map((s) => (
            <button key={s.id} className="name-card" onClick={() => { setPicked(s); setError(""); }}>
              <Avatar name={s.name} />
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <Banner error={error} />
        <InstallBanner />
      </div>
    );
  }

  // --- step C: enter PIN ---
  return (
    <div className="login">
      <div className="pin-hero">
        <Avatar name={picked.name} size="lg" />
        <h1>{picked.name}</h1>
        <p className="subtitle">Enter your PIN</p>
        <div className="pin-display">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < pin.length ? "filled" : ""} />
          ))}
        </div>
      </div>
      {busy ? <p className="login-status">Checking…</p> : <Banner error={error} />}
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)}>{d}</button>
        ))}
        <button className="ghost" onClick={() => { setPicked(null); setPin(""); setError(""); }}>Back</button>
        <button onClick={() => press("0")}>0</button>
        <button className="ghost" onClick={() => setPin(pin.slice(0, -1))} aria-label="Delete last digit"><BackspaceIcon size={20} /></button>
      </div>
    </div>
  );
}
