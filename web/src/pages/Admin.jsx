import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { DAY_NAMES, fmtTime, todayIso, addDays, hoursBetween } from "../util.js";
import Avatar from "../components/Avatar.jsx";

const blankShift = { staff_id: "", day_of_week: 0, start_time: "08:00", end_time: "13:00", location_id: "", role_id: "" };

// Shared add/edit sheet for a single fixed-roster shift.
function ShiftEditor({ meta, initial, onClose, onSaved, notify }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(initial.id);
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const valid = f.staff_id && f.location_id && f.role_id && f.end_time > f.start_time;
  const dur = f.end_time > f.start_time ? hoursBetween(f.start_time, f.end_time) : 0;

  const save = () => {
    if (!f.staff_id || !f.location_id || !f.role_id) return notify("Pick staff, location and role.");
    if (f.end_time <= f.start_time) return notify("End time must be after start time.");
    setBusy(true);
    const payload = {
      staff_id: f.staff_id, day_of_week: Number(f.day_of_week),
      start_time: f.start_time, end_time: f.end_time,
      location_id: f.location_id, role_id: f.role_id,
    };
    const req = isEdit
      ? api("/admin/template", { method: "PUT", body: { ...payload, id: initial.id } })
      : api("/admin/template", { method: "POST", body: payload });
    req
      .then(() => { notify(isEdit ? "Shift updated." : "Shift added to the roster."); onSaved(); })
      .catch((e) => notify(e.message))
      .finally(() => setBusy(false));
  };

  const del = () => {
    if (!confirm("Remove this shift from the fixed weekly roster?")) return;
    setBusy(true);
    api(`/admin/template?id=${initial.id}`, { method: "DELETE" })
      .then(() => { notify("Shift removed."); onSaved(); })
      .catch((e) => notify(e.message))
      .finally(() => setBusy(false));
  };

  const active = (meta?.staff ?? []).filter((s) => s.active);

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <h2>{isEdit ? "Edit shift" : "Add shift"}</h2>

        <div className="editor-field">
          <label>Staff member</label>
          <select value={f.staff_id} onChange={(e) => set({ staff_id: e.target.value })}>
            <option value="">Choose staff…</option>
            {active.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="editor-field">
          <label>Day of week</label>
          <select value={f.day_of_week} onChange={(e) => set({ day_of_week: Number(e.target.value) })}>
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>

        <div className="editor-field">
          <label>Time</label>
          <div className="time-field">
            <input type="time" value={f.start_time} onChange={(e) => set({ start_time: e.target.value })} />
            <span className="dash">→</span>
            <input type="time" value={f.end_time} onChange={(e) => set({ end_time: e.target.value })} />
            <span className="hours-pill">{dur > 0 ? `${dur}h` : "—"}</span>
          </div>
        </div>

        <div className="editor-grid">
          <div className="editor-field">
            <label>Location</label>
            <select value={f.location_id} onChange={(e) => set({ location_id: e.target.value })}>
              <option value="">Choose…</option>
              {meta?.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="editor-field">
            <label>Role</label>
            <select value={f.role_id} onChange={(e) => set({ role_id: e.target.value })}>
              <option value="">Choose…</option>
              {meta?.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <div className="editor-actions">
          <button className="btn" onClick={save} disabled={busy || !valid}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add shift"}
          </button>
          {isEdit && (
            <button className="btn small secondary" style={{ color: "var(--red)" }} onClick={del} disabled={busy}>
              Delete
            </button>
          )}
          <span className="grow" />
          <button className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function Admin({ me, notify, onLogout }) {
  const [meta, setMeta] = useState(null);
  const [template, setTemplate] = useState(null);
  const [editing, setEditing] = useState(null); // shift editor payload, or null
  const [staffForm, setStaffForm] = useState({ name: "", pin: "", contract_hours: 0 });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api("/meta").then(setMeta).catch((e) => notify(e.message));
    api("/admin/template").then((d) => setTemplate(d.template)).catch((e) => notify(e.message));
  };
  useEffect(load, []); // eslint-disable-line

  const openNew = (dow = 0) => setEditing({ ...blankShift, day_of_week: dow });
  const openEdit = (t) => setEditing({
    id: t.id, staff_id: t.staff_id, day_of_week: t.day_of_week,
    start_time: t.start_time.slice(0, 5), end_time: t.end_time.slice(0, 5),
    location_id: t.location_id, role_id: t.role_id,
  });
  const onSaved = () => { setEditing(null); load(); };

  const applyTemplate = () => {
    if (!confirm("Re-apply the fixed roster to the next 8 weeks? Unswapped shifts will be rebuilt from the template. Approved swaps are kept.")) return;
    setBusy(true);
    api("/admin/regenerate", { method: "POST", body: { start: todayIso(), end: addDays(todayIso(), 55) } })
      .then(() => notify("Roster re-applied for the next 8 weeks."))
      .catch((e) => notify(e.message))
      .finally(() => setBusy(false));
  };

  const resetPin = (s) => {
    const pin = prompt(`New 4-digit PIN for ${s.name}:`);
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

  const dayHours = (rows) =>
    Math.round(rows.reduce((a, t) => a + hoursBetween(t.start_time.slice(0, 5), t.end_time.slice(0, 5)), 0) * 10) / 10;

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

      <div className="roster-toolbar">
        <p className="section-title" style={{ margin: 0 }}>Weekly roster</p>
        <button className="btn small" onClick={() => openNew(0)}>+ New shift</button>
      </div>
      <p className="hint" style={{ margin: "-6px 0 12px", fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
        Tap any shift to edit its person, time, location or role — or use a day's <strong>+ Add</strong> button.
      </p>

      {template === null && <p className="empty">Loading…</p>}
      {template !== null && (
        <div className="cards-grid">
          {DAY_NAMES.map((day, dow) => {
            const rows = template.filter((t) => t.day_of_week === dow);
            return (
              <div className="card" key={dow}>
                <div className="day-head-row">
                  <span className="bar" />
                  <h3>{day}</h3>
                  <span className="day-meta">
                    {rows.length} {rows.length === 1 ? "shift" : "shifts"} · {dayHours(rows)}h
                  </span>
                </div>
                {rows.length === 0 && <p className="day-empty">No shifts yet</p>}
                {rows.map((t) => (
                  <button className="shift-chip" key={t.id} onClick={() => openEdit(t)}>
                    <Avatar name={t.staff.name} size="sm" />
                    <div className="grow">
                      <div>
                        <strong>{t.staff.name}</strong>
                        <span className="when">{fmtTime(t.start_time)} – {fmtTime(t.end_time)}</span>
                      </div>
                      <div className="sub">📍 {t.location.name} · {t.role.name}</div>
                    </div>
                    <svg className="edit-ic" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                ))}
                <button className="add-shift" onClick={() => openNew(dow)}>+ Add shift</button>
              </div>
            );
          })}
        </div>
      )}

      <div className="cards-grid">
        <div className="card">
          <h3>Apply roster changes</h3>
          <p style={{ fontSize: 13, color: "var(--muted)", fontWeight: 500, marginBottom: 12 }}>
            Roster changes apply automatically to future weeks as they're viewed. Use this to force-rebuild
            the next 8 weeks now (approved swaps are kept).
          </p>
          <button className="btn" onClick={applyTemplate} disabled={busy}>
            {busy ? "Applying…" : "Re-apply next 8 weeks"}
          </button>
        </div>
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

      {editing && (
        <ShiftEditor
          meta={meta}
          initial={editing}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
