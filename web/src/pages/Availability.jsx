import React, { useEffect, useState } from "react";
import { api } from "../api.js";
import { DAY_SHORT, fmtDate, todayIso, addDays, dowOf } from "../util.js";
import { PlaneIcon, PalmIcon } from "../components/Icons.jsx";
import CalendarSync from "../components/CalendarSync.jsx";

// Monday of next week: the first day of the fortnight staff are planning for
function upcomingMonday() {
  const today = todayIso();
  return addDays(today, 7 - dowOf(today));
}

const blankFortnight = (start) =>
  Array.from({ length: 14 }, (_, i) => ({
    avail_date: addDays(start, i),
    is_available: false,
    available_from: "08:00",
    available_to: "17:00",
    note: "",
  }));

export default function Availability({ me, notify }) {
  const [start, setStart] = useState(upcomingMonday());
  const [days, setDays] = useState(blankFortnight(upcomingMonday()));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeOff, setTimeOff] = useState([]);
  const [form, setForm] = useState({ start_date: "", end_date: "", note: "" });

  const load = (from) => {
    const end = addDays(from, 13);
    api(`/availability?start=${from}&end=${end}`).then((d) => {
      const fresh = blankFortnight(from);
      for (const row of d.availability) {
        const i = fresh.findIndex((x) => x.avail_date === row.avail_date);
        if (i === -1) continue;
        fresh[i] = {
          avail_date: row.avail_date,
          is_available: row.is_available,
          available_from: (row.available_from ?? "08:00").slice(0, 5),
          available_to: (row.available_to ?? "17:00").slice(0, 5),
          note: row.note ?? "",
        };
      }
      setDays(fresh);
      setDirty(false);
    }).catch((e) => notify(e.message, "error"));
    api("/unavailability").then((d) => setTimeOff(d.unavailability)).catch(() => {});
  };

  useEffect(() => load(start), [start]); // eslint-disable-line

  const move = (delta) => {
    if (dirty && !confirm("You have unsaved changes. Discard them?")) return;
    setStart((s) => addDays(s, delta));
  };

  const update = (i, patch) => {
    setDays((w) => w.map((d, j) => (j === i ? { ...d, ...patch } : d)));
    setDirty(true);
  };

  const copyWeek = () => {
    setDays((w) => w.map((d, i) => (i < 7 ? d : { ...w[i - 7], avail_date: d.avail_date })));
    setDirty(true);
  };

  const save = () => {
    setSaving(true);
    const rows = days.map((d) => ({
      avail_date: d.avail_date,
      is_available: d.is_available,
      available_from: d.is_available ? d.available_from : null,
      available_to: d.is_available ? d.available_to : null,
      note: d.note || null,
    }));
    api("/availability", { method: "POST", body: { days: rows } })
      .then(() => {
        notify("Availability saved for the fortnight.", "success");
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
        load(start);
      })
      .catch((e) => notify(e.message, "error"));
  };

  const removeTimeOff = (id) => {
    api(`/unavailability?id=${id}`, { method: "DELETE" })
      .then(() => load(start))
      .catch((e) => notify(e.message, "error"));
  };

  const weekCard = (weekIdx) => {
    const slice = days.slice(weekIdx * 7, weekIdx * 7 + 7);
    return (
      <div className="card" key={weekIdx}>
        <h3>
          Week {weekIdx + 1} · {fmtDate(slice[0].avail_date)} – {fmtDate(slice[6].avail_date)}
        </h3>
        {slice.map((d, j) => {
          const i = weekIdx * 7 + j;
          return (
            <div className="avail-day" key={d.avail_date}>
              <span className="dayname">
                {DAY_SHORT[dowOf(d.avail_date)]} {Number(d.avail_date.slice(8, 10))}
              </span>
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
          );
        })}
        {weekIdx === 1 && (
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn small secondary" onClick={copyWeek}>Copy week 1 → week 2</button>
          </div>
        )}
      </div>
    );
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

      <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
        <button className="btn small secondary" onClick={() => move(-14)}>‹</button>
        <strong style={{ flex: 1, textAlign: "center" }}>
          Fortnight: {fmtDate(start)} – {fmtDate(addDays(start, 13))}
        </strong>
        <button className="btn small secondary" onClick={() => move(14)}>›</button>
      </div>
      <p className="sub" style={{ textAlign: "center", marginBottom: 12 }}>
        Fill in when you can work over the next two weeks so the roster can be planned ahead.
      </p>

      <div className="av-grid">
        {weekCard(0)}
        {weekCard(1)}

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
