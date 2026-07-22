import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { iso, todayIso, parseIso, fmtTime, fmtDateLong, DAY_SHORT } from "../util.js";

function monthGrid(year, month) {
  // returns array of date-strings covering the month, padded to full Mon-Sun weeks
  const first = new Date(year, month, 1);
  const startPad = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startPad);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(iso(d));
  }
  // trim trailing week if entirely out of month
  while (cells.length > 35 && parseIso(cells[35]).getMonth() !== month) cells.splice(35);
  return cells;
}

export default function Calendar({ me, notify }) {
  const today = todayIso();
  const [view, setView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);
  const [data, setData] = useState({ shifts: [], unavailability: [] });
  const [scope, setScope] = useState("mine");
  const [loading, setLoading] = useState(false);
  const [offerShift, setOfferShift] = useState(null);
  const [offerNote, setOfferNote] = useState("");

  const cells = useMemo(() => monthGrid(view.y, view.m), [view]);

  useEffect(() => {
    const start = cells[0];
    const end = cells[cells.length - 1];
    setLoading(true);
    api(`/calendar?start=${start}&end=${end}`)
      .then(setData)
      .catch((e) => notify(e.message))
      .finally(() => setLoading(false));
  }, [cells]); // eslint-disable-line

  const byDate = useMemo(() => {
    const m = {};
    for (const s of data.shifts) (m[s.shift_date] ??= []).push(s);
    return m;
  }, [data]);

  const awayByDate = (date) =>
    data.unavailability.filter((u) => u.start_date <= date && u.end_date >= date);

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
  });

  const nav = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const dayShifts = (byDate[selected] ?? []).filter(
    (s) => scope === "all" || s.staff_id === me.id,
  );
  const away = awayByDate(selected);

  const submitOffer = () => {
    api("/offers", { method: "POST", body: { shiftInstanceId: offerShift.id, note: offerNote } })
      .then(() => {
        notify("Shift offered for swap — it's now visible in Offers.");
        setOfferShift(null);
        setOfferNote("");
      })
      .catch((e) => notify(e.message));
  };

  return (
    <>
      <header className="topbar">
        <h1>Calendar</h1>
        <button
          className="link-btn"
          onClick={() => {
            const d = new Date();
            setView({ y: d.getFullYear(), m: d.getMonth() });
            setSelected(today);
          }}
        >
          Today
        </button>
      </header>
      <div className="page">
        <div className="cal-card">
          <div className="cal-head">
            <button onClick={() => nav(-1)} aria-label="Previous month">‹</button>
            <span className="month">{monthName}</span>
            <button onClick={() => nav(1)} aria-label="Next month">›</button>
          </div>
          <div className="cal-grid">
            {DAY_SHORT.map((d) => (
              <span key={d} className="dow">{d}</span>
            ))}
            {cells.map((date) => {
              const inMonth = parseIso(date).getMonth() === view.m;
              const shifts = byDate[date] ?? [];
              const mine = shifts.some((s) => s.staff_id === me.id);
              const team = shifts.length > 0 && !mine;
              return (
                <button
                  key={date}
                  className={[
                    "cal-cell",
                    inMonth ? "" : "out",
                    date === selected ? "selected" : "",
                    date === today ? "today" : "",
                  ].join(" ")}
                  onClick={() => setSelected(date)}
                >
                  <span className="num">{parseIso(date).getDate()}</span>
                  <span className="dots">
                    {mine && <i className="mine" />}
                    {team && scope === "all" && <i className="team" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="seg">
          <button className={scope === "mine" ? "active" : ""} onClick={() => setScope("mine")}>
            My shifts
          </button>
          <button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>
            Everyone
          </button>
        </div>

        <p className="day-title">{fmtDateLong(selected)}</p>
        {loading && <p className="empty">Loading…</p>}
        {!loading && away.length > 0 && (
          <div className="shift-card">
            <span className="dot" style={{ background: "#e2574c" }} />
            <div>
              <p className="title" style={{ fontSize: 14 }}>Away / Leave</p>
              <p className="meta">{away.map((u) => u.staff.name + (u.note ? ` (${u.note})` : "")).join(", ")}</p>
            </div>
          </div>
        )}
        {!loading && dayShifts.length === 0 && (
          <p className="empty">No shifts {scope === "mine" ? "for you " : ""}on this day.</p>
        )}
        {dayShifts.map((s) => {
          const isMine = s.staff_id === me.id;
          const canOffer = isMine && s.shift_date >= today;
          return (
            <div className="shift-card" key={s.id}>
              <span className={"dot" + (s.status === "swapped" ? " swapped" : "")} />
              <div>
                <p className="time">
                  {fmtTime(s.start_time)} - {fmtTime(s.end_time)}
                </p>
                <p className="title">
                  {s.staff.name}
                  {s.status === "swapped" ? " (Swapped in)" : ""}
                </p>
                <p className="meta">
                  {s.location.name}, {s.role.name}
                </p>
              </div>
              <div className="right">
                {isMine && <span className="badge mine">You</span>}{" "}
                {canOffer && (
                  <button className="btn small secondary" onClick={() => setOfferShift(s)}>
                    Offer swap
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {offerShift && (
        <div className="modal-back" onClick={() => setOfferShift(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Offer this shift for swap?</h2>
            <div className="card">
              <p className="time">{fmtDateLong(offerShift.shift_date)}</p>
              <p className="title">
                {fmtTime(offerShift.start_time)} - {fmtTime(offerShift.end_time)}
              </p>
              <p className="meta">
                {offerShift.location.name}, {offerShift.role.name}
              </p>
            </div>
            <div className="row">
              <input
                type="text"
                placeholder="Note (optional), e.g. appointment"
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div className="row" style={{ marginTop: 12 }}>
              <button className="btn" onClick={submitOffer}>Offer shift</button>
              <button className="btn secondary" onClick={() => setOfferShift(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
