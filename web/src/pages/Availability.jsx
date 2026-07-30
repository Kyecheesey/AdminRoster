import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { DAY_NAMES, DAY_SHORT, fmtDate } from "../util.js";
import { PlaneIcon, PalmIcon } from "../components/Icons.jsx";
import CalendarSync from "../components/CalendarSync.jsx";

const blankWeek = () =>
  DAY_NAMES.map((_, i) => ({
    day_of_week: i,
    is_available: false,
    available_from: "08:00",
    available_to: "17:00",
    note: "",
  }));

export default function Availability({ me, notify }) {
  const [week, setWeek] = useState(blankWeek());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeOff, setTimeOff] = useState([]);
  const [form, setForm] = useState({ start_date: "", end_date: "", note: "" });

  const load = () => {
    api("/availability").then((d) => {
      const w = blankWeek();
      for (const row of d.availability) {
        w[row.day_of_week] = {
          day_of_week: row.day_of_week,
          is_available: row.is_available,
          available_from: (row.available_from ?? "08:00").slice(0, 5),
          available_to: (row.available_to ?? "17:00").slice(0, 5),
          note: row.note ?? "",
        };
      }
      setWeek(w);
      setDirty(false);
    }).catch((e) => notify(e.message, "error"));
    api("/unavailability").then((d) => setTimeOff(d.unavailability)).catch(() => {});
  };

  useEffect(load, []); // eslint-disable-line

  const update = (i, patch) => {
    setWeek((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    setDirty(true);
  };

  const save = () => {
    setSaving(true);
    const days = week.map((d) => ({
      day_of_week: d.day_of_week,
      is_available: d.is_available,
      available_from: d.is_available ? d.available_from : null,
      available_to: d.is_available ? d.available_to : null,
      note: d.note || null,
    }));
    api("/availability", { method: "POST", body: { days } })
      .then(() => {
        notify("Availability saved.", "success");
        setDirty(false);
      })
      .catch((e) => notify(e.message, "error"))
      .finally(() => setSaving(false));
  };

  const addTimeOff = () => {
    if (!form.start_date || !form.end_date) return notify("Pick start and end dates.", "error");
    if (form.end_date < form.start_date) return notify("End date is before start date.", "error");
    api("/unavailability", { method: "POST", body: form })
      .then(() => {
        notify("Time off requested — an admin will review it.", "success");
        setForm({ start_date: "", end_date: "", note: "" });
        load();
      })
      .catch((e) => notify(e.message, "error"));
  };

  const removeTimeOff = (id) => {
    api(`/unavailability?id=${id}`, { method: "DELETE" })
      .then(load)
      .catch((e) => notify(e.message, "error"));
  };

  return (
    <div className="plain-page">
      <header className="topbar">
        <h1>Availability</h1>
        {dirty && (
          <button className="link-btn" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </header>

      <div className="av-grid">
      <div className="card">
        <h3>My weekly availability</h3>
        {week.map((d, i) => (
          <div className="avail-day" key={i}>
            <span className="dayname">{DAY_SHORT[i]}</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={d.is_available}
                onChange={(e) => update(i, { is_available: e.target.checked })}
              />
              <span className="track" />
            </label>
            {d.is_available ? (
              <span className="avail-times">
                <input
                  type="time"
                  value={d.available_from}
                  onChange={(e) => update(i, { available_from: e.target.value })}
                />
                –
                <input
                  type="time"
                  value={d.available_to}
                  onChange={(e) => update(i, { available_to: e.target.value })}
                />
              </span>
            ) : (
              <span className="avail-times">Not available</span>
            )}
          </div>
        ))}
        {dirty && (
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save availability"}
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Time off / away</h3>
        {timeOff.length === 0 && (
          <p className="empty" style={{ padding: "10px 0 4px" }}>
            <span className="big"><PalmIcon size={26} /></span>
            <strong>No time off booked</strong>
            Add dates below. Requests are reviewed before they go on the roster.
          </p>
        )}
        {timeOff.map((u) => (
          <div className="list-row" key={u.id}>
            <span className="chip away only-icon"><PlaneIcon size={13} /></span>
            <div className="grow">
              <strong>{fmtDate(u.start_date)}{u.end_date !== u.start_date ? ` – ${fmtDate(u.end_date)}` : ""}</strong>
              <span className={`ua-badge ${u.status || "approved"}`}>
                {u.status === "pending" ? "Pending" : u.status === "denied" ? "Denied" : "Approved"}
              </span>
              {u.note && <div className="sub">{u.note}</div>}
              {u.admin_note && <div className="sub manager-note">Manager: {u.admin_note}</div>}
            </div>
            <button className="btn small secondary" onClick={() => removeTimeOff(u.id)}>Remove</button>
          </div>
        ))}
        <div className="timeoff-form">
          <div>
            <label htmlFor="to-from">First day</label>
            <input
              id="to-from" type="date" value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="to-to">Last day</label>
            <input
              id="to-to" type="date" value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
          <div className="full">
            <label htmlFor="to-note">Reason (optional)</label>
            <input
              id="to-note" type="text" placeholder="e.g. family holiday"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          <div className="full">
            <button className="btn" onClick={addTimeOff}>Request time off</button>
          </div>
        </div>
      </div>
      </div>

      <CalendarSync notify={notify} />
    </div>
  );
}
