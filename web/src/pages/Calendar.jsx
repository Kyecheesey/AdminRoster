import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "../api.js";
import {
  iso, todayIso, parseIso, fmtDate, fmtDateLong, DAY_SHORT, DAY_NAMES,
  dowOf, addDays, hoursBetween, fmtTime,
} from "../util.js";
import ShiftCard from "../components/ShiftCard.jsx";
import { ChevronLeft, ChevronRight, PlaneIcon, CalendarIcon, SwapIcon, CheckIcon, ArrowRight } from "../components/Icons.jsx";
import { SkeletonRows } from "../components/Skeleton.jsx";
import { Greeting, Weather, UpNext, QuoteOfTheDay } from "../components/DayHeader.jsx";

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

export default function Calendar({ me, notify, onNavigate }) {
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
  // side panel context — loaded quietly, never blocks the roster
  const [openOffers, setOpenOffers] = useState(null);
  const [availDays, setAvailDays] = useState(null);

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

  useEffect(() => {
    api("/offers")
      .then((d) => setOpenOffers((d.offers ?? []).filter((o) => o.status === "open" && o.offered_by !== me.id)))
      .catch(() => setOpenOffers([]));
    api("/availability")
      .then((d) => setAvailDays(
        (d.availability ?? []).filter((a) => a.is_available && a.staff_id === me.id).length,
      ))
      .catch(() => setAvailDays(null));
  }, [me.id]);

  const byDate = useMemo(() => {
    const m = {};
    for (const s of data.shifts) (m[s.shift_date] ??= []).push(s);
    return m;
  }, [data]);

  // Team roster is an explicit, per-day choice — picking a new day always
  // starts back on the viewer's own shifts rather than carrying "Team
  // roster" forward from whichever day they last looked at.
  useEffect(() => setScope("mine"), [selected]);

  const awayByDate = (date) =>
    data.unavailability.filter((u) => u.start_date <= date && u.end_date >= date);

  const monthName = new Date(view.y, view.m, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" });

  const nav = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };

  const goToday = () => {
    const d = new Date();
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setSelected(today);
  };

  const dayShifts = (byDate[selected] ?? []).filter((s) => scope === "all" || s.staff_id === me.id);
  const away = awayByDate(selected);

  // my totals for the Mon-Sun week containing the selected day
  const weekStart = addDays(selected, -dowOf(selected));
  const weekEnd = addDays(weekStart, 6);
  const myWeek = data.shifts.filter(
    (s) => s.staff_id === me.id && s.shift_date >= weekStart && s.shift_date <= weekEnd,
  );
  const myWeekHours =
    Math.round(myWeek.reduce((a, s) => a + hoursBetween(s.start_time.slice(0, 5), s.end_time.slice(0, 5)), 0) * 10) / 10;

  // the fortnight ahead, for the "coming up" list
  const upcoming = data.shifts
    .filter((s) => s.staff_id === me.id && s.shift_date >= today && s.shift_date <= addDays(today, 13))
    .sort((a, b) => (a.shift_date + a.start_time).localeCompare(b.shift_date + b.start_time));
  const nextShift = upcoming[0];

  const submitOffer = () => {
    api("/offers", { method: "POST", body: { shiftInstanceId: offerShift.id, note: offerNote } })
      .then(() => {
        notify("Shift offered for swap — it's now visible in Offers.", "success");
        setOfferShift(null);
        setOfferNote("");
      })
      .catch((e) => notify(e.message, "error"));
  };

  const relativeDay = (d) => {
    if (d === today) return "Today";
    if (d === addDays(today, 1)) return "Tomorrow";
    return DAY_NAMES[dowOf(d)];
  };

  return (
    <div className="dash">
      <header className="dash-head">
        <Greeting name={me.name} />
        <div className="greet-side">
          <Weather />
          <button className="link-btn" onClick={goToday}>Today</button>
        </div>
      </header>

      {/* Two columns: the month on the left as a picker, and everything that
          answers "am I working?" on the right, where the eye lands first. */}
      <div className="dash-cols">
        <div className="dash-col">
          {/* --- month --- */}
          <div className="card cal-card">
            <div className="cal-head">
              <button className="nav-btn" onClick={() => nav(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
              <span className="month">{monthName}</span>
              <button className="nav-btn" onClick={() => nav(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            </div>
            <div className="cal-grid">
              {DAY_SHORT.map((d) => <span key={d} className="dow">{d.toUpperCase()}</span>)}
              {cells.map((date) => {
                const inMonth = parseIso(date).getMonth() === view.m;
                const shifts = byDate[date] ?? [];
                const mine = shifts.some((s) => s.staff_id === me.id);
                const team = shifts.length > 0 && !mine;
                return (
                  <button
                    key={date}
                    className={["cal-cell", inMonth ? "" : "out", date === selected ? "selected" : "", date === today ? "today" : ""].join(" ")}
                    onClick={() => setSelected(date)}
                    title={`${fmtDate(date)}${mine ? " — you're rostered" : team ? " — someone is rostered" : ""}`}
                    aria-label={`${fmtDate(date)}${mine ? ", you are rostered" : ""}`}
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
            <p className="cal-legend">
              <span><i className="mine" /> Your shift</span>
              <span><i className="team" /> Someone else&apos;s</span>
            </p>
          </div>

          {/* --- the fortnight ahead --- */}
          <div className="card soon-card">
            <h3>Coming up</h3>
            {upcoming.length === 0 && (
              <p className="side-empty">Nothing rostered in the next two weeks.</p>
            )}
            {upcoming.slice(0, 7).map((s) => (
              <button
                key={s.id}
                className={`up-row${s.shift_date === selected ? " on" : ""}`}
                onClick={() => setSelected(s.shift_date)}
                title={`${fmtDateLong(s.shift_date)} · ${s.location.name}`}
              >
                <span className="ur-day">
                  <b>{relativeDay(s.shift_date)}</b>
                  <span>{fmtDate(s.shift_date)}</span>
                </span>
                <span className="ur-time">{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</span>
              </button>
            ))}
            {upcoming.length > 7 && (
              <p className="side-more">+{upcoming.length - 7} more in the fortnight</p>
            )}
          </div>
        </div>

        <div className="dash-col">
          {/* the one question everyone opens this page to answer */}
          <div className="dash-lead">
            <UpNext shifts={data.shifts} me={me} />
            <div className="stat-strip two">
              <div className="stat">
                <div className="v">{myWeek.length}</div>
                <div className="l">{myWeek.length === 1 ? "Shift this week" : "Shifts this week"}</div>
              </div>
              <div className="stat">
                <div className="v">{myWeekHours}</div>
                <div className="l">{myWeekHours === 1 ? "Hour this week" : "Hours this week"}</div>
              </div>
            </div>
          </div>

          {/* --- the selected day --- */}
          <div className="card day-card">
            <div className="day-card-head">
              <h2>{selected === today ? "Today" : fmtDateLong(selected)}</h2>
              {selected !== today && <button className="link-btn small" onClick={goToday}>Back to today</button>}
            </div>
            <div className="seg">
              <button className={scope === "mine" ? "active" : ""} onClick={() => setScope("mine")}>My shifts</button>
              <button className={scope === "all" ? "active" : ""} onClick={() => setScope("all")}>Team roster</button>
            </div>

            {loading && <SkeletonRows count={2} />}

            {!loading && away.length > 0 && (
              <div className="away-note">
                <PlaneIcon size={14} />
                <span>{away.map((u) => u.staff.name + (u.note ? ` (${u.note})` : "")).join(", ")} away</span>
              </div>
            )}

            {/* One empty state, and it says what to do next. */}
            {!loading && dayShifts.length === 0 && (
              <div className="day-empty-state">
                <span className="de-ic"><CheckIcon size={22} /></span>
                <strong>
                  {scope === "mine"
                    ? selected === today ? "You're not rostered today" : "You're not rostered"
                    : "Nobody is rostered"}
                </strong>
                {scope === "mine" && nextShift ? (
                  <>
                    <p>
                      Your next shift is {relativeDay(nextShift.shift_date)},{" "}
                      {fmtDate(nextShift.shift_date)} at {fmtTime(nextShift.start_time)}.
                    </p>
                    <button className="btn small secondary" onClick={() => setSelected(nextShift.shift_date)}>
                      Go to that day <ArrowRight size={14} />
                    </button>
                  </>
                ) : scope === "mine" ? (
                  <>
                    <p>You have no upcoming shifts on the roster.</p>
                    <button className="btn small secondary" onClick={() => onNavigate?.("availability")}>
                      Update your availability <ArrowRight size={14} />
                    </button>
                  </>
                ) : (
                  <p>Nothing scheduled for this day.</p>
                )}
              </div>
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
                  action={canOffer ? <button className="btn small secondary" onClick={() => setOfferShift(s)}>Offer swap</button> : null}
                />
              );
            })}
          </div>

          {/* --- the two other places you might be heading --- */}
          <div className="tile-row">
            <button className="card tile" onClick={() => onNavigate?.("availability")}>
              <span className="tile-ic"><CalendarIcon size={18} /></span>
              <span className="tile-txt">
                <strong>{availDays === null ? "Availability" : availDays > 0 ? `Available ${availDays} ${availDays === 1 ? "day" : "days"} a week` : "Availability not set"}</strong>
                <span>{availDays ? "Update when you can work" : "Tell us when you can work"}</span>
              </span>
              <ArrowRight size={16} />
            </button>

            <button className="card tile" onClick={() => onNavigate?.("offers")}>
              <span className="tile-ic"><SwapIcon size={18} /></span>
              <span className="tile-txt">
                <strong>
                  {openOffers === null ? "Shift offers"
                    : openOffers.length === 0 ? "No shifts up for swap"
                    : `${openOffers.length} shift${openOffers.length === 1 ? "" : "s"} up for swap`}
                </strong>
                <span>{openOffers?.length ? "Someone needs cover" : "Offer one of yours, or take a shift"}</span>
              </span>
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="card quote-card">
            <h3>Daily reflection</h3>
            <QuoteOfTheDay />
          </div>
        </div>
      </div>

      {offerShift && createPortal(
        <div className="modal-back" onClick={() => setOfferShift(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="grab" />
            <h2>Offer this shift for swap?</h2>
            <ShiftCard shift={offerShift} isMine={false} subtitle={fmtDateLong(offerShift.shift_date)} />
            <div className="row">
              <input
                type="text" placeholder="Note (optional), e.g. appointment"
                value={offerNote} onChange={(e) => setOfferNote(e.target.value)} style={{ flex: 1 }}
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
