import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import Avatar from "../components/Avatar.jsx";

export default function Login({ onLogin }) {
  const [staff, setStaff] = useState(null);
  const [picked, setPicked] = useState(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/bootstrap")
      .then((d) => setStaff(d.staff))
      .catch(() => setError("Could not load staff list. Check your connection."));
  }, []);

  useEffect(() => {
    if (pin.length !== 4 || !picked || busy) return;
    setBusy(true);
    api("/login", { method: "POST", body: { staffId: picked.id, pin } })
      .then((d) => onLogin(d))
      .catch((e) => {
        setError(e.message);
        setPin("");
      })
      .finally(() => setBusy(false));
  }, [pin, picked, busy, onLogin]);

  const press = (d) => {
    setError("");
    if (pin.length < 4) setPin(pin + d);
  };

  if (!picked) {
    return (
      <div className="login">
        <div className="brandmark">📅</div>
        <h1>Admin Roster</h1>
        <p className="subtitle">Who's signing in?</p>
        <div className="name-grid">
          {staff === null && (
            <p style={{ color: "#bcc1ef", gridColumn: "1/-1", textAlign: "center" }}>Loading…</p>
          )}
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
