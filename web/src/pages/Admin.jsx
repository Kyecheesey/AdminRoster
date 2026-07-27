import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";
import { DAY_NAMES, fmtTime, fmtDate, fmtDateLong, todayIso, addDays, hoursBetween, weekEndingIso, dayMonth } from "../util.js";
import Avatar from "../components/Avatar.jsx";

const blankShift = { id: null, staff_id: "", day_of_week: 0, start_time: "08:00", end_time: "13:00", location_id: "", role_id: "" };
const hm = (t) => (t ? t.slice(0, 5) : "");
// two [start,end) time ranges (HH:MM strings) overlap
const overlaps = (aS, aE, bS, bE) => aS < bE && bS < aE;

// Flag double-books and availability clashes for the shift being edited.
function shiftWarnings(f, template, availability) {
  if (!f.staff_id) return [];
  const dow = Number(f.day_of_week);
  const out = [];
  for (const t of template) {
    if (t.staff_id !== f.staff_id || t.day_of_week !== dow || t.id === f.id) continue;
    if (overlaps(f.start_time, f.end_time, hm(t.start_time), hm(t.end_time))) {
      out.push(`Overlaps their ${fmtTime(t.start_time)}–${fmtTime(t.end_time)} shift on ${DAY_NAMES[dow]}.`);
    }
  }
  const a = (availability ?? []).find((x) => x.staff_id === f.staff_id && x.day_of_week === dow);
  if (a && !a.is_available) {
    out.push(`Marked unavailable on ${DAY_NAMES[dow]}.`);
  } else if (a && a.is_available && a.available_from && a.available_to) {
    if (f.start_time < hm(a.available_from) || f.end_time > hm(a.available_to)) {
      out.push(`Outside their available hours (${fmtTime(a.available_from)}–${fmtTime(a.available_to)}).`);
    }
  }
  return out;
}

// Shared add/edit sheet for a single fixed-roster shift.
function ShiftEditor({ meta, template, availability, initial, onClose, onSaved, notify }) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(f.id);
  const set = (patch) => setF((prev) => ({ ...prev, ...patch }));
  const valid = f.staff_id && f.location_id && f.role_id && f.end_time > f.start_time;
  const dur = f.end_time > f.start_time ? hoursBetween(f.start_time, f.end_time) : 0;
  const warnings = useMemo(() => shiftWarnings(f, template ?? [], availability), [f, template, availability]);

  const save = () => {
    if (!f.staff_id || !f.location_id || !f.role_id) return notify("Pick staff, location and role.", "error");
    if (f.end_time <= f.start_time) return notify("End time must be after start time.", "error");
    setBusy(true);
    const payload = {
      staff_id: f.staff_id, day_of_week: Number(f.day_of_week),
      start_time: f.start_time, end_time: f.end_time,
      location_id: f.location_id, role_id: f.role_id,
    };
    const req = f.id
      ? api("/admin/template", { method: "PUT", body: { ...payload, id: f.id } })
      : api("/admin/template", { method: "POST", body: payload });
    req
      .then(() => { notify(f.id ? "Shift updated." : "Shift added to the roster.", "success"); onSaved(); })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  const del = () => {
    if (!confirm("Remove this shift from the fixed weekly roster?")) return;
    setBusy(true);
    api(`/admin/template?id=${f.id}`, { method: "DELETE" })
      .then(() => { notify("Shift removed.", "success"); onSaved(); })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  const duplicate = () => {
    set({ id: null });
    notify("Duplicated — adjust the day or person, then add.");
  };

  const active = (meta?.staff ?? []).filter((s) => s.active);

  return createPortal(
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

        {warnings.length > 0 && (
          <div className="editor-warn" role="alert">
            <strong>⚠ Heads up</strong>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            <span className="tiny">You can still save — this is just a flag.</span>
          </div>
        )}

        <div className="editor-actions">
          <button className="btn" onClick={save} disabled={busy || !valid}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add shift"}
          </button>
          {isEdit && (
            <>
              <button className="btn small secondary" onClick={duplicate} disabled={busy}>Duplicate</button>
              <button className="btn small secondary" style={{ color: "var(--red)" }} onClick={del} disabled={busy}>Delete</button>
            </>
          )}
          <span className="grow" />
          <button className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function Admin({ me, notify, onLogout }) {
  const [meta, setMeta] = useState(null);
  const [template, setTemplate] = useState(null);
  const [availability, setAvailability] = useState([]);
  const [editing, setEditing] = useState(null); // shift editor payload, or null
  const [staffForm, setStaffForm] = useState({ name: "", pin: "", contract_hours: 0 });
  const [busy, setBusy] = useState(false);
  const [orgs, setOrgs] = useState(null); // platform-admin org directory
  const [orgForm, setOrgForm] = useState({ name: "", short_name: "", domain: "", adminName: "", adminPin: "" });
  const [timeOff, setTimeOff] = useState(null); // all staff holiday requests
  const [reviewNote, setReviewNote] = useState({}); // per-request comment draft
  const [weekEnding, setWeekEnding] = useState(weekEndingIso()); // Sunday the roster is built to
  const weekStart = addDays(weekEnding, -6); // Monday of the selected week

  const loadOrgs = () => {
    if (!me.isPlatformAdmin) return;
    api("/platform/orgs").then((d) => setOrgs(d.organisations)).catch((e) => notify(e.message, "error"));
  };

  const loadTimeOff = () =>
    api("/unavailability?all=1").then((d) => setTimeOff(d.unavailability ?? [])).catch((e) => notify(e.message, "error"));

  const load = () => {
    api("/meta").then(setMeta).catch((e) => notify(e.message, "error"));
    api("/admin/template").then((d) => setTemplate(d.template)).catch((e) => notify(e.message, "error"));
    api("/availability?all=1").then((d) => setAvailability(d.availability ?? [])).catch(() => {});
    loadTimeOff();
    loadOrgs();
  };
  useEffect(load, []); // eslint-disable-line

  const reviewTimeOff = (u, action) => {
    api(`/unavailability/${u.id}/${action}`, { method: "POST", body: { note: reviewNote[u.id] || null } })
      .then(() => {
        notify(`${u.staff.name}'s time off ${action === "approve" ? "approved" : "denied"}.`, "success");
        setReviewNote((m) => ({ ...m, [u.id]: "" }));
        loadTimeOff();
      })
      .catch((e) => notify(e.message, "error"));
  };

  const addOrg = () => {
    if (!orgForm.name.trim() || !orgForm.adminName.trim()) return notify("Workplace name and first admin name are required.", "error");
    if (!/^\d{4}$/.test(orgForm.adminPin)) return notify("The admin PIN must be exactly 4 digits.", "error");
    setBusy(true);
    api("/platform/orgs", { method: "POST", body: {
      name: orgForm.name.trim(), short_name: orgForm.short_name.trim() || null,
      domain: orgForm.domain.trim() || null, adminName: orgForm.adminName.trim(), adminPin: orgForm.adminPin,
    } })
      .then((d) => {
        notify(`${d.org.name} created. Its admin can sign in now.`, "success");
        setOrgForm({ name: "", short_name: "", domain: "", adminName: "", adminPin: "" });
        loadOrgs();
      })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  const openNew = (dow = 0) => setEditing({ ...blankShift, day_of_week: dow });
  const openEdit = (t) => setEditing({
    id: t.id, staff_id: t.staff_id, day_of_week: t.day_of_week,
    start_time: hm(t.start_time), end_time: hm(t.end_time),
    location_id: t.location_id, role_id: t.role_id,
  });
  const onSaved = () => { setEditing(null); load(); };

  const applyFromWeek = () => {
    const start = weekStart < todayIso() ? todayIso() : weekStart;
    if (!confirm(`Build the roster for the 8 weeks from ${fmtDateLong(start)}? Unswapped shifts are rebuilt from the roster; approved swaps are kept.`)) return;
    setBusy(true);
    api("/admin/regenerate", { method: "POST", body: { start, end: addDays(start, 55) } })
      .then(() => notify(`Roster built for the 8 weeks from ${fmtDate(start)}.`, "success"))
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  const startFresh = () => {
    if (!confirm("Start a fresh roster? This clears every shift in the weekly roster and removes upcoming auto-generated shifts so you can build a new one from scratch. Approved swaps are kept. This cannot be undone.")) return;
    setBusy(true);
    api("/admin/template/clear", { method: "POST" })
      .then(() => { notify("Fresh roster started — the week is now empty.", "success"); load(); })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setBusy(false));
  };

  const resetPin = (s) => {
    const pin = prompt(`New 4-digit PIN for ${s.name}:`);
    if (!pin) return;
    api("/admin/staff", { method: "POST", body: { id: s.id, pin } })
      .then(() => notify(`PIN updated for ${s.name}.`, "success"))
      .catch((e) => notify(e.message, "error"));
  };

  const toggleActive = (s) => {
    api("/admin/staff", { method: "POST", body: { id: s.id, active: !s.active } })
      .then(load)
      .catch((e) => notify(e.message, "error"));
  };

  const addStaff = () => {
    if (!staffForm.name || !staffForm.pin) return notify("Name and PIN are required.", "error");
    api("/admin/staff", { method: "POST", body: { ...staffForm, contract_hours: Number(staffForm.contract_hours) } })
      .then(() => {
        notify(`${staffForm.name} added.`, "success");
        setStaffForm({ name: "", pin: "", contract_hours: 0 });
        load();
      })
      .catch((e) => notify(e.message, "error"));
  };

  const dayHours = (rows) =>
    Math.round(rows.reduce((a, t) => a + hoursBetween(hm(t.start_time), hm(t.end_time)), 0) * 10) / 10;

  const weeklyHours = (staffId) =>
    Math.round((template ?? [])
      .filter((t) => t.staff.id === staffId)
      .reduce((acc, t) => acc + hoursBetween(hm(t.start_time), hm(t.end_time)), 0) * 10) / 10;

  const totalHours = (template ?? []).reduce(
    (acc, t) => acc + hoursBetween(hm(t.start_time), hm(t.end_time)), 0,
  );
  const activeStaff = meta?.staff.filter((s) => s.active) ?? [];

  // per-person rostered vs contract, for the balance panel
  const balance = activeStaff.map((s) => {
    const rostered = weeklyHours(s.id);
    const contract = Number(s.contract_hours) || 0;
    const diff = Math.round((rostered - contract) * 10) / 10;
    let status;
    if (!contract) status = { label: `${rostered}h`, cls: "muted" };
    else if (diff > 0.05) status = { label: `+${diff}h over`, cls: "over" };
    else if (diff < -0.05) status = { label: `${Math.abs(diff)}h under`, cls: "under" };
    else status = { label: "On target", cls: "on" };
    const pct = contract ? Math.min(rostered / contract, 1) * 100 : 0;
    return { s, rostered, contract, status, pct };
  }).sort((a, b) => (b.rostered - b.contract) - (a.rostered - a.contract));

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
          <div className="v">{activeStaff.length || "–"}</div>
          <div className="l">Active staff</div>
        </div>
      </div>

      <p className="section-title">Build roster</p>
      <div className="card roster-setup">
        <div className="setup-main">
          <div className="setup-field">
            <label>Week ending</label>
            <input type="date" value={weekEnding} onChange={(e) => setWeekEnding(e.target.value || weekEndingIso())} />
          </div>
          <div className="setup-desc">
            <strong>{fmtDate(weekStart)} → {fmtDate(weekEnding)}</strong>
            <span>Pick the week this roster is for. Day columns below show that week's dates.</span>
          </div>
        </div>
        <div className="setup-actions">
          <button className="btn secondary" onClick={startFresh} disabled={busy}>Start fresh</button>
          <button className="btn" onClick={applyFromWeek} disabled={busy}>
            {busy ? "Working…" : "Build 8 weeks from here"}
          </button>
        </div>
      </div>

      <div className="roster-toolbar">
        <p className="section-title" style={{ margin: 0 }}>Weekly roster</p>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn small secondary" onClick={() => window.print()}>Print</button>
          <button className="btn small" onClick={() => openNew(0)}>+ New shift</button>
        </div>
      </div>
      <p className="hint">
        Tap any shift to edit its person, time, location or role. The editor flags double-bookings and
        availability clashes as you go.
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
                  <h3>{day} <span className="day-date">{dayMonth(addDays(weekStart, dow))}</span></h3>
                  <span className="day-meta">
                    {rows.length} {rows.length === 1 ? "shift" : "shifts"} · {dayHours(rows)}h
                  </span>
                </div>
                {rows.length === 0 && <p className="day-empty">No shifts yet</p>}
                {rows.map((t) => {
                  const warn = shiftWarnings(
                    { id: t.id, staff_id: t.staff_id, day_of_week: t.day_of_week, start_time: hm(t.start_time), end_time: hm(t.end_time) },
                    template, availability,
                  );
                  return (
                    <button className={`shift-chip${warn.length ? " has-warn" : ""}`} key={t.id} onClick={() => openEdit(t)}>
                      <Avatar name={t.staff.name} size="sm" />
                      <div className="grow">
                        <div>
                          <strong>{t.staff.name}</strong>
                          <span className="when">{fmtTime(t.start_time)} – {fmtTime(t.end_time)}</span>
                          {warn.length > 0 && <span className="warn-dot" title={warn.join(" ")}>⚠</span>}
                        </div>
                        <div className="sub">📍 {t.location.name} · {t.role.name}</div>
                      </div>
                      <svg className="edit-ic" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>
                  );
                })}
                <button className="add-shift" onClick={() => openNew(dow)}>+ Add shift</button>
              </div>
            );
          })}
        </div>
      )}

      <p className="section-title">Weekly hours balance</p>
      <div className="card">
        {balance.length === 0 && <p className="empty" style={{ padding: 8 }}>—</p>}
        {balance.map(({ s, rostered, contract, status, pct }) => (
          <div className="balance-row" key={s.id}>
            <Avatar name={s.name} size="sm" />
            <div className="grow">
              <div className="balance-top">
                <strong>{s.name}</strong>
                <span className={`bal-chip ${status.cls}`}>{status.label}</span>
              </div>
              <div className="balance-bar">
                <span className={`fill ${status.cls}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="sub">{rostered}h rostered{contract ? ` · ${contract}h contract` : " · no contract set"}</div>
            </div>
          </div>
        ))}
      </div>

      {(() => {
        const list = timeOff ?? [];
        const pending = list.filter((u) => u.status === "pending");
        const decided = list.filter((u) => u.status !== "pending");
        return (
          <>
            <p className="section-title">
              Time off &amp; holidays
              {pending.length > 0 && <span className="pending-count">{pending.length} to review</span>}
            </p>
            <div className="card">
              {timeOff === null && <p className="empty" style={{ padding: 8 }}>Loading…</p>}
              {timeOff !== null && list.length === 0 && (
                <p className="empty" style={{ padding: 12 }}><span className="big">🏖️</span>No time off requested.</p>
              )}
              {pending.map((u) => (
                <div className="timeoff-row pending" key={u.id}>
                  <div className="timeoff-head">
                    <Avatar name={u.staff.name} size="sm" />
                    <div className="grow">
                      <strong>{u.staff.name}</strong>
                      <span className="ua-badge pending">Pending</span>
                      <div className="sub">
                        {fmtDate(u.start_date)}{u.end_date !== u.start_date ? ` – ${fmtDate(u.end_date)}` : ""}
                        {u.note ? ` · ${u.note}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="timeoff-actions">
                    <input
                      type="text" placeholder="Add a comment (optional)"
                      value={reviewNote[u.id] || ""}
                      onChange={(e) => setReviewNote((m) => ({ ...m, [u.id]: e.target.value }))}
                    />
                    <button className="btn small green" onClick={() => reviewTimeOff(u, "approve")}>Approve</button>
                    <button className="btn small red" onClick={() => reviewTimeOff(u, "deny")}>Deny</button>
                  </div>
                </div>
              ))}
              {decided.map((u) => (
                <div className="list-row" key={u.id}>
                  <Avatar name={u.staff.name} size="sm" />
                  <div className="grow">
                    <strong>{u.staff.name}</strong>
                    <span className={`ua-badge ${u.status}`}>{u.status === "approved" ? "Approved" : "Denied"}</span>
                    <div className="sub">
                      {fmtDate(u.start_date)}{u.end_date !== u.start_date ? ` – ${fmtDate(u.end_date)}` : ""}
                      {u.note ? ` · ${u.note}` : ""}
                    </div>
                    {u.admin_note && <div className="sub manager-note">Your note: {u.admin_note}</div>}
                  </div>
                  {u.status === "denied" && (
                    <button className="btn small secondary" onClick={() => reviewTimeOff(u, "approve")}>Approve</button>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      })()}

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

      {me.isPlatformAdmin && (
        <>
          <p className="section-title">Organisations <span className="plat-tag">RosterME platform</span></p>
          <div className="card">
            {orgs === null && <p className="empty" style={{ padding: 8 }}>Loading…</p>}
            {orgs?.map((o) => (
              <div className="list-row" key={o.id}>
                <span className="org-badge sm">{(o.short_name || o.name).slice(0, 3)}</span>
                <div className="grow">
                  <strong>{o.name}</strong>
                  <div className="sub">
                    {o.staff_count} staff · code <code>{o.slug}</code>
                    {o.domain ? ` · ${o.domain}` : " · no custom domain"}
                  </div>
                </div>
              </div>
            ))}
            <div className="org-add">
              <p className="mini-label">Add a workplace</p>
              <div className="row">
                <input type="text" placeholder="Workplace name" value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} style={{ flex: 2, minWidth: 160 }} />
                <input type="text" placeholder="Badge (e.g. M&M)" value={orgForm.short_name}
                  onChange={(e) => setOrgForm({ ...orgForm, short_name: e.target.value })} style={{ flex: 1, minWidth: 110 }} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <input type="text" placeholder="Custom domain (optional)" value={orgForm.domain}
                  onChange={(e) => setOrgForm({ ...orgForm, domain: e.target.value })} style={{ flex: 1, minWidth: 200 }} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <input type="text" placeholder="First admin name" value={orgForm.adminName}
                  onChange={(e) => setOrgForm({ ...orgForm, adminName: e.target.value })} style={{ flex: 2, minWidth: 150 }} />
                <input type="text" inputMode="numeric" maxLength={4} placeholder="Admin PIN" value={orgForm.adminPin}
                  onChange={(e) => setOrgForm({ ...orgForm, adminPin: e.target.value.replace(/\D/g, "") })} style={{ width: 96 }} />
                <button className="btn" onClick={addOrg} disabled={busy}>Create</button>
              </div>
              <p className="hint" style={{ margin: "8px 0 0" }}>
                New workplaces start with one location and role and their own admin — everything is kept separate from other organisations.
              </p>
            </div>
          </div>
        </>
      )}

      {/* Clean printable weekly roster (screen-hidden, shown by the Print button) */}
      {template !== null && (
        <div className="print-roster">
          <h1>The Mood &amp; Mind Centre — Weekly Roster</h1>
          {DAY_NAMES.map((day, dow) => {
            const rows = template.filter((t) => t.day_of_week === dow);
            if (rows.length === 0) return null;
            return (
              <div className="print-day" key={dow}>
                <h2>{day} <span>· {dayHours(rows)}h</span></h2>
                <table>
                  <tbody>
                    {rows.map((t) => (
                      <tr key={t.id}>
                        <td className="pr-who">{t.staff.name}</td>
                        <td className="pr-time">{fmtTime(t.start_time)} – {fmtTime(t.end_time)}</td>
                        <td className="pr-loc">{t.location.name}</td>
                        <td className="pr-role">{t.role.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ShiftEditor
          meta={meta}
          template={template}
          availability={availability}
          initial={editing}
          notify={notify}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
