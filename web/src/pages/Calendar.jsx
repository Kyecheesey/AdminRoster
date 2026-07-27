import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";
import { iso, todayIso, parseIso, fmtDateLong, DAY_SHORT, dowOf, addDays, hoursBetween } from "../util.js";
import ShiftCard from "../components/ShiftCard.jsx";

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
      .catch((e) => notify(e.message, "error"))
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

  // my totals for the Mon-Sun week containing the selected day
  const weekStart = addDays(selected, -dowOf(selected));
  const weekEnd = addDays(weekStart, 6);
  const myWeek = data.shifts.filter(
    (s) => s.staff_id === me.id && s.shift_date >= weekStart && s.shift_date <= weekEnd,
  );
  const myWeekHours =
    Math.round(myWeek.reduce((a, s) => a + hoursBetween(s.start_time.slice(0, 5), s.end_time.slice(0, 5)), 0) * 10) / 10;

  const submitOffer = () => {
    api("/offers", { method: "POST", body: { shiftInstanceId: offerShift.id, note: offerNote } })
      .then(() => {
        notify("Shift offered for swap — it's now visible in Offers.", "success");
        setOfferShift(null);
        setOfferNote("");
      })
      .catch((e) => notify(e.message, "error"));
  };

  return (
    <div className="cal-wrap">
      <div className="hero">
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
        <div className="cal-head">
          <button className="nav-btn" onClick={() => nav(-1)} aria-label="Previous month">‹</button>
          <span className="month">{monthName}</span>
          <button className="nav-btn" onClick={() => nav(1)} aria-label="Next month">›</button>
        </div>
        <div className="cal-grid">
          {DAY_SHORT.map((d) => (
            <span key={d} className="dow">{d.toUpperCase()}</span>
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

      <div className="sheet">
        <div className="stat-strip two">
          <div className="stat">
            <div className="v">{myWeek.length}</div>
            <div className="l">My shifts this week</div>
          </div>
          <div className="stat">
            <div className="v">{myWeekHours}<span className="unit">h</span></div>
            <div className="l">My hours this week</div>
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
          <div className="card" style={{ padding: "12px 14px" }}>
            <div className="row">
              <span className="chip away">✈️ Away</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--muted)" }}>
                {away.map((u) => u.staff.name + (u.note ? ` (${u.note})` : "")).join(", ")}
              </span>
            </div>
          </div>
        )}
        {!loading && dayShifts.length === 0 && (
          <p className="empty">
            <span className="big">🌤️</span>
            No shifts {scope === "mine" ? "for you " : ""}on this day.
          </p>
        )}
        {dayShifts.map((s) => {
          const isMine = s.staff_id === me.id;
          const canOffer = isMine && s.shift_date >= today;
          const staffAway = away.some((u) => u.staff.id === s.staff_id);
          return (
            <ShiftCard
              key={s.id}
              shift={s}
              isMine={isMine}
              away={staffAway}
              action={
                canOffer ? (
                  <button className="btn small secondary" onClick={() => setOfferShift(s)}>
                    Offer swap
                  </button>
                ) : null
              }
            />
          );
        })}
      </div>

      {offerShift && createPortal(
        <div className="modal-back" onClick={() => setOfferShift(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h2>Offer this shift for swap?</h2>
            <ShiftCard shift={offerShift} isMine={false} subtitle={fmtDateLong(offerShift.shift_date)} />
            <div className="row">
              <input
                type="text"
                placeholder="Note (optional), e.g. appointment"
                value={offerNote}
                onChange={(e) => setOfferNote(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div className="row" style={{ marginTop: 14 }}>
              <button className="btn" onClick={submitOffer}>Offer shift</button>
              <button className="btn secondary" onClick={() => setOfferShift(null)}>Cancel</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
