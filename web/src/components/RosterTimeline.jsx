import React, { useMemo, useState } from "react";
import { DAY_NAMES, DAY_SHORT, fmtTime, hoursBetween, addDays, dayMonth, toMinutes, roleColor, occursOn, freqLabel } from "../util.js";
import { PinIcon, CalendarIcon, WarnIcon, PlusIcon } from "./Icons.jsx";

const hm = (t) => (t ? t.slice(0, 5) : "");
const PX_PER_HOUR = 62; // wide enough to read a 30-minute bar

/**
 * The roster as a time axis rather than a list.
 *
 * A list of shifts tells you who is on; it doesn't tell you when the floor is
 * thin. Laying every shift on a shared hour axis makes gaps, overlaps and
 * double-books visible at a glance — the thing a wall roster does well and a
 * card list can't.
 */
export default function RosterTimeline({ template, weekStart, availability, onEdit, onAdd }) {
  const [dow, setDow] = useState(() => (new Date().getDay() + 6) % 7);

  // the tabs show a real week, so resolve occurrences against that date
  const date = addDays(weekStart, dow);
  const rows = useMemo(
    () =>
      (template ?? [])
        .filter((t) => occursOn(t, date))
        .slice()
        .sort((a, b) => hm(a.start_time).localeCompare(hm(b.start_time))),
    [template, date],
  );

  // Only show the hours the day actually uses, padded to whole hours, so a
  // 9-5 roster doesn't waste half the screen on empty night-time columns.
  const { startH, endH, hours } = useMemo(() => {
    if (rows.length === 0) return { startH: 8, endH: 18, hours: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18] };
    const mins = rows.flatMap((t) => [toMinutes(hm(t.start_time)), toMinutes(hm(t.end_time))]);
    const s = Math.floor(Math.min(...mins) / 60);
    const e = Math.ceil(Math.max(...mins) / 60);
    const span = Math.max(e - s, 4); // never so narrow that bars lose meaning
    const list = [];
    for (let h = s; h <= s + span; h++) list.push(h);
    return { startH: s, endH: s + span, hours: list };
  }, [rows]);

  const totalMin = (endH - startH) * 60;
  const pct = (min) => ((min - startH * 60) / totalMin) * 100;

  // headcount per half hour — the coverage strip under the axis
  const coverage = useMemo(() => {
    const slots = [];
    for (let m = startH * 60; m < endH * 60; m += 30) {
      slots.push(rows.filter((t) => toMinutes(hm(t.start_time)) <= m && toMinutes(hm(t.end_time)) > m).length);
    }
    return slots;
  }, [rows, startH, endH]);
  const peak = Math.max(1, ...coverage);

  // group by location, the way a floor plan divides the place up
  const groups = useMemo(() => {
    const m = new Map();
    for (const t of rows) {
      const key = t.location?.name ?? "Unassigned";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(t);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const dayHours =
    Math.round(rows.reduce((a, t) => a + hoursBetween(hm(t.start_time), hm(t.end_time)), 0) * 10) / 10;
  const trackWidth = Math.max((endH - startH) * PX_PER_HOUR, 320);

  // someone rostered on a day they've said they can't work
  const clash = (t) => {
    const a = (availability ?? []).find((x) => x.staff_id === t.staff_id && x.day_of_week === dow);
    if (!a) return false;
    if (!a.is_available) return true;
    if (!a.available_from || !a.available_to) return false;
    return hm(t.start_time) < hm(a.available_from) || hm(t.end_time) > hm(a.available_to);
  };

  return (
    <div className="tl-wrap">
      <div className="tl-days" role="tablist" aria-label="Day of week">
        {DAY_NAMES.map((d, i) => {
          const n = (template ?? []).filter((t) => occursOn(t, addDays(weekStart, i))).length;
          return (
            <button
              key={i} role="tab" aria-selected={i === dow}
              className={i === dow ? "active" : ""}
              onClick={() => setDow(i)}
            >
              <span className="d">{DAY_SHORT[i]}</span>
              <span className="dt">{dayMonth(addDays(weekStart, i))}</span>
              <span className={`ct${n === 0 ? " zero" : ""}`}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="tl-summary">
        <strong>{DAY_NAMES[dow]}</strong>
        <span>{rows.length} {rows.length === 1 ? "shift" : "shifts"} · {dayHours}h · peak {peak} on</span>
        <button className="btn small" onClick={() => onAdd(dow)}><PlusIcon size={14} /> Add shift</button>
      </div>

      {rows.length === 0 ? (
        <p className="empty">
          <span className="big"><CalendarIcon size={26} /></span>
          <strong>Nothing rostered on {DAY_NAMES[dow]}</strong>
          Add a shift and it'll appear on the timeline.
        </p>
      ) : (
        <div className="tl-scroll">
          <div className="tl-inner" style={{ "--track": `${trackWidth}px` }}>
            {/* hour axis */}
            <div className="tl-row tl-axis">
              <div className="tl-label" />
              <div className="tl-track">
                {hours.slice(0, -1).map((h) => (
                  <span key={h} className="tl-hour" style={{ left: `${pct(h * 60)}%`, width: `${(60 / totalMin) * 100}%` }}>
                    {h % 12 === 0 ? 12 : h % 12}{h < 12 ? "am" : "pm"}
                  </span>
                ))}
                {/* the closing hour, pinned to the right edge so the axis reads
                    as a finished range rather than trailing off */}
                <span className="tl-hour end">
                  {endH % 12 === 0 ? 12 : endH % 12}{endH < 12 || endH === 24 ? "am" : "pm"}
                </span>
              </div>
            </div>

            {/* coverage */}
            <div className="tl-row tl-cover">
              <div className="tl-label">On the floor</div>
              <div className="tl-track">
                {coverage.map((c, i) => (
                  <span
                    key={i}
                    className={`tl-cov${c === 0 ? " none" : ""}`}
                    style={{
                      left: `${(i / coverage.length) * 100}%`,
                      width: `${(1 / coverage.length) * 100}%`,
                      "--h": `${(c / peak) * 100}%`,
                    }}
                    title={`${c} on at ${hours[0] + Math.floor(i / 2)}:${i % 2 ? "30" : "00"}`}
                  >
                    <i />
                  </span>
                ))}
              </div>
            </div>

            {groups.map(([loc, items]) => (
              <React.Fragment key={loc}>
                <div className="tl-group">
                  <span className="pin"><PinIcon size={12} /></span>{loc}
                  <span className="gn">{items.length}</span>
                </div>
                {items.map((t) => {
                  const s = toMinutes(hm(t.start_time));
                  const e = toMinutes(hm(t.end_time));
                  const c = roleColor(t.role?.name ?? "");
                  const warn = clash(t);
                  return (
                    <div className="tl-row" key={t.id}>
                      <div className="tl-label" title={t.staff.name}>{t.staff.name}</div>
                      <div className="tl-track">
                        {hours.slice(1, -1).map((h) => (
                          <span key={h} className="tl-grid" style={{ left: `${pct(h * 60)}%` }} />
                        ))}
                        <button
                          className={`tl-bar${warn ? " warn" : ""}`}
                          style={{
                            left: `${pct(s)}%`,
                            width: `${Math.max(((e - s) / totalMin) * 100, 6)}%`,
                            background: c.bar,
                            color: c.ink,
                          }}
                          onClick={() => onEdit(t)}
                          title={`${t.staff.name} · ${fmtTime(t.start_time)}–${fmtTime(t.end_time)} · ${t.role?.name ?? ""} · ${freqLabel(t.frequency)}`}
                        >
                          <span className="bt">{t.role?.name}</span>
                          <span className="bh">{hoursBetween(hm(t.start_time), hm(t.end_time))}h</span>
                          {warn && <span className="bw"><WarnIcon size={12} /></span>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
