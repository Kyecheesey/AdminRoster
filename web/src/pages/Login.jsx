import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";

export default function Login({ onLogin }) {
  const [orgs, setOrgs] = useState(null);   // list of workplaces, or null while loading
  const [org, setOrg] = useState(null);      // chosen workplace
  const [staff, setStaff] = useState(null);  // staff for the chosen workplace
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 1. load the workplace directory; auto-select by domain, or if there's only one
  useEffect(() => {
    api("/orgs")
      .then((d) => {
        const list = d.organisations ?? [];
        setOrgs(list);
        const byDomain = list.find((o) => o.domain && o.domain === window.location.hostname);
        if (byDomain) setOrg(byDomain);
        else if (list.length === 1) setOrg(list[0]);
      })
      .catch(() => setError("Could not load workplaces. Check your connection."));
  }, []);

  // 2. once a workplace is chosen, load its staff
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

  const press = (d) => {
    setError("");
    if (pin.length < 4) setPin(pin + d);
  };

  const Wordmark = () => (
    <>
      <div className="brandmark">🗓️</div>
      <h1 className="wordmark">Roster<span>ME</span></h1>
    </>
  );

  // --- step A: choose a workplace ---
  if (!org) {
    return (
      <div className="login">
        <Wordmark />
        <p className="subtitle">Choose your workplace</p>
        <div className="org-grid">
          {orgs === null && <p className="load-note">Loading…</p>}
          {orgs?.length === 0 && <p className="load-note">No workplaces set up yet.</p>}
          {orgs?.map((o) => (
            <button key={o.id} className="org-card" onClick={() => { setOrg(o); setError(""); }}>
              <span className="org-badge">{(o.short_name || o.name).slice(0, 3)}</span>
              <span className="org-name">{o.name}</span>
            </button>
          ))}
        </div>
        <p className="error">{error}</p>
      </div>
    );
  }

  // --- step B: choose who's signing in ---
  if (!picked) {
    return (
      <div className="login">
        <Wordmark />
        <p className="org-context">
          <span className="org-badge sm">{(org.short_name || org.name).slice(0, 3)}</span>
          {org.name}
          {orgs && orgs.length > 1 && (
            <button className="switch-org" onClick={() => { setOrg(null); setStaff(null); setError(""); }}>
              Change
            </button>
          )}
        </p>
        <p className="subtitle">Who's signing in?</p>
        <div className="name-grid">
          {staff === null && <p className="load-note">Loading…</p>}
          {staff?.map((s) => (
            <button key={s.id} className="name-card" onClick={() => { setPicked(s); setError(""); }}>
              <Avatar name={s.name} />
              {s.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <p className="error">{error}</p>
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
      <p className="error">{busy ? "Checking…" : error}</p>
      <div className="keypad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} onClick={() => press(d)}>{d}</button>
        ))}
        <button className="ghost" onClick={() => { setPicked(null); setPin(""); setError(""); }}>Back</button>
        <button onClick={() => press("0")}>0</button>
        <button className="ghost" onClick={() => setPin(pin.slice(0, -1))}>⌫</button>
      </div>
    </div>
  );
}
