import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { DAY_NAMES, fmtTime, todayIso, addDays, hoursBetween } from "../util.js";
import Avatar from "../components/Avatar.jsx";

const blankShift = { staff_id: "", day_of_week: 0, start_time: "08:00", end_time: "13:00", location_id: "", role_id: "" };

export default function Admin({ me, notify, onLogout }) {
  const [meta, setMeta] = useState(null);
  const [template, setTemplate] = useState(null);
  const [form, setForm] = useState(blankShift);
  const [staffForm, setStaffForm] = useState({ name: "", pin: "", contract_hours: 0 });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api("/meta").then(setMeta).catch((e) => notify(e.message));
    api("/admin/template").then((d) => setTemplate(d.template)).catch((e) => notify(e.message));
  };
  useEffect(load, []); // eslint-disable-line

  const addShift = () => {
    const f = form;
    if (!f.staff_id || !f.location_id || !f.role_id) return notify("Pick staff, location and role.");
    if (f.end_time <= f.start_time) return notify("End time must be after start time.");
    api("/admin/template", { method: "POST", body: { ...f, day_of_week: Number(f.day_of_week) } })
      .then(() => {
        notify("Shift added to the fixed roster.");
        setForm({ ...blankShift, staff_id: f.staff_id, day_of_week: f.day_of_week, location_id: f.location_id, role_id: f.role_id });
        load();
      })
      .catch((e) => notify(e.message));
  };

  const removeShift = (id) => {
    if (!confirm("Remove this shift from the fixed weekly roster?")) return;
    api(`/admin/template?id=${id}`, { method: "DELETE" })
      .then(() => { notify("Shift removed."); load(); })
      .catch((e) => notify(e.message));
  };

  const applyTemplate = () => {
    if (!confirm("Re-apply the fixed roster to the next 8 weeks? Unswapped shifts will be rebuilt from the template. Approved swaps are kept.")) return;
    setBusy(true);
    api("/admin/regenerate", { method: "POST", body: { start: todayIso(), end: addDays(todayIso(), 55) } })
      .then(() => notify("Roster re-applied for the next 8 weeks."))
      .catch((e) => notify(e.message))
      .finally(() => setBusy(false));
  };

  const resetPin = (s) => {
    const pin = prompt(`New PIN for ${s.name} (4-8 digits):`);
    if (!pin) return;
    api("/admin/staff", { method: "POST", body: { id: s.id, pin } })
      .then(() => notify(`PIN updated for ${s.name}.`))
      .catch((e) => notify(e.message));
  };

  const toggleActive = (s) => {
    api("/admin/staff", { method: "POST", body: { id: s.id, active: !s.active } })
      .then(load)
      .catch((e) => notify(e.message));
  };

  const addStaff = () => {
    if (!staffForm.name || !staffForm.pin) return notify("Name and PIN are required.");
    api("/admin/staff", { method: "POST", body: { ...staffForm, contract_hours: Number(staffForm.contract_hours) } })
      .then(() => {
        notify(`${staffForm.name} added.`);
        setStaffForm({ name: "", pin: "", contract_hours: 0 });
        load();
      })
      .catch((e) => notify(e.message));
  };

  const weeklyHours = (staffId) =>
    (template ?? [])
      .filter((t) => t.staff.id === staffId)
      .reduce((acc, t) => acc + hoursBetween(t.start_time.slice(0, 5), t.end_time.slice(0, 5)), 0);

  const totalHours = (template ?? []).reduce(
    (acc, t) => acc + hoursBetween(t.start_time.slice(0, 5), t.end_time.slice(0, 5)), 0,
  );
  const activeStaff = meta?.staff.filter((s) => s.active).length ?? 0;

  return (
    <div className="plain-page">
      <header className="topbar">
        <h1>Admin</h1>
        <button className="link-btn" style={{ color: "var(--red)" }} onClick={onLogout}>Sign out</button>
      </header>

      <div className="stat-strip">
        <div className="stat">
          <div className="v">{template?.length ?? "–"}</div>
          <div className="l">Shifts / wk</div>
        </div>
        <div className="stat">
          <div className="v">{Math.round(totalHours * 10) / 10 || "–"}</div>
          <div className="l">Hours / wk</div>
        </div>
        <div className="stat">
          <div className="v">{activeStaff || "–"}</div>
          <div className="l">Active staff</div>
        </div>
      </div>

      <p className="section-title">Fixed weekly roster</p>
      {template === null && <p className="empty">Loading…</p>}
      {template !== null &&
        DAY_NAMES.map((day, dow) => {
          const rows = template.filter((t) => t.day_of_week === dow);
          if (rows.length === 0) return null;
          return (
            <div className="card" key={dow}>
              <div className="day-header">
                <span className="bar" />
                <h3 style={{ marginBottom: 0 }}>{day}</h3>
              </div>
              {rows.map((t) => (
                <div className="list-row" key={t.id}>
                  <Avatar name={t.staff.name} size="sm" />
                  <div className="grow">
                    <strong>{t.staff.name}</strong>{" "}
                    <span style={{ color: "var(--muted)", fontWeight: 700, fontSize: 13 }}>
                      {fmtTime(t.start_time)} – {fmtTime(t.end_time)}
                    </span>
                    <div className="sub">
                      📍 {t.location.name} · {t.role.name}
                    </div>
                  </div>
                  <button className="btn small secondary" onClick={() => removeShift(t.id)}>Remove</button>
                </div>
              ))}
            </div>
          );
        })}

      <div className="card">
        <h3>Add shift to fixed roster</h3>
        <div className="row">
          <select value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}>
            <option value="">Staff…</option>
            {meta?.staff.filter((s) => s.active).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}>
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div className="row">
          <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <span style={{ color: "var(--muted)", fontWeight: 700 }}>to</span>
          <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
        </div>
        <div className="row">
          <select value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
            <option value="">Location…</option>
            {meta?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <select value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
            <option value="">Role…</option>
            {meta?.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={addShift}>Add shift</button>
        </div>
      </div>

      <div className="card">
        <h3>Apply roster changes</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginBottom: 12 }}>
          Template changes apply automatically to future weeks as they're viewed. Use this to force-rebuild
          the next 8 weeks now (approved swaps are kept).
        </p>
        <button className="btn" onClick={applyTemplate} disabled={busy}>
          {busy ? "Applying…" : "Re-apply next 8 weeks"}
        </button>
      </div>

      <p className="section-title">Staff</p>
      <div className="card">
        {meta?.staff.map((s) => (
          <div className="list-row" key={s.id}>
            <Avatar name={s.name} size="sm" />
            <div className="grow">
              <strong>{s.name}</strong>
              {s.is_admin && <span className="chip you" style={{ marginLeft: 6, fontSize: 10 }}>Admin</span>}
              {!s.active && <span className="badge cancelled" style={{ marginLeft: 6 }}>Inactive</span>}
              <div className="sub">
                Rostered {weeklyHours(s.id)}h / contract {s.contract_hours}h
              </div>
            </div>
            <button className="btn small secondary" onClick={() => resetPin(s)}>PIN</button>
            {s.id !== me.id && (
              <button className="btn small secondary" onClick={() => toggleActive(s)}>
                {s.active ? "Disable" : "Enable"}
              </button>
            )}
          </div>
        ))}
        <div className="row" style={{ marginTop: 12 }}>
          <input
            type="text" placeholder="New staff name"
            value={staffForm.name}
            onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
            style={{ flex: 1, minWidth: 130 }}
          />
          <input
            type="text" placeholder="PIN" size={5}
            value={staffForm.pin}
            onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value })}
            style={{ width: 76 }}
          />
          <input
            type="number" placeholder="Hours"
            value={staffForm.contract_hours}
            onChange={(e) => setStaffForm({ ...staffForm, contract_hours: e.target.value })}
            style={{ width: 76 }}
          />
          <button className="btn" onClick={addStaff}>Add</button>
        </div>
      </div>
    </div>
  );
}
