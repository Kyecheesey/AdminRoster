import React, { useEffect, useState } from "react";
import { fmtTime, todayIso, parseIso } from "../util.js";
import { PinIcon } from "./Icons.jsx";

/* ==========================================================================
   The top of the Calendar: who you are, what day it is, and — the part that
   actually matters — when you are next working.
   ========================================================================== */

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function Greeting({ name }) {
  const now = new Date();
  const first = (name ?? "").trim().split(/\s+/)[0] || "there";
  return (
    <div className="greet">
      <h1>{greetingFor(now.getHours())}, {first}</h1>
      <p className="greet-date">
        {now.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}
      </p>
    </div>
  );
}

/* ---------------- weather ---------------- */

// WMO codes, grouped to the handful of states worth distinguishing on a roster
function describe(code) {
  if (code === 0) return { label: "Clear", icon: "sun" };
  if (code <= 2) return { label: "Mostly sunny", icon: "sun" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code <= 48) return { label: "Fog", icon: "cloud" };
  if (code <= 67) return { label: "Rain", icon: "rain" };
  if (code <= 77) return { label: "Snow", icon: "rain" };
  if (code <= 82) return { label: "Showers", icon: "rain" };
  if (code <= 99) return { label: "Storms", icon: "storm" };
  return { label: "", icon: "cloud" };
}

const WeatherIcon = ({ kind }) => {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (kind === "sun") return <svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 3v2m0 14v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M3 12h2m14 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" /></svg>;
  if (kind === "rain") return <svg {...p}><path d="M7 16a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.4 1.6A3.5 3.5 0 0 1 17.5 16H7Z" /><path d="M9 19.5 8 21m4-1.5-1 1.5m4-1.5-1 1.5" /></svg>;
  if (kind === "storm") return <svg {...p}><path d="M7 15a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.4 1.6A3.5 3.5 0 0 1 17.5 15H7Z" /><path d="m12 17-2 3h3l-2 3" /></svg>;
  return <svg {...p}><path d="M7 18a4.2 4.2 0 0 1 .5-8.4 5.7 5.7 0 0 1 10.8 1.7A3.6 3.6 0 0 1 17.6 18H7Z" /></svg>;
};

/**
 * Local conditions for the workplace.
 *
 * Deliberately best-effort: it is a nicety on a screen people open to find
 * their shifts, so it renders nothing at all until it succeeds, times out
 * quickly, and never shows a spinner or an error. A weather outage must not
 * be visible on the roster.
 */
export function Weather({ lat = -27.97, lon = 153.41 }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    const stop = new AbortController();
    const timer = setTimeout(() => stop.abort(), 4000);
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,weather_code&timezone=auto`,
      { signal: stop.signal },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.current) {
          setNow({ temp: Math.round(d.current.temperature_2m), ...describe(d.current.weather_code) });
        }
      })
      .catch(() => { /* stay silent — this is decoration, not information */ })
      .finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); stop.abort(); };
  }, [lat, lon]);

  if (!now) return null;
  return (
    <div className="weather" title={`${now.label}, ${now.temp}°C`}>
      <WeatherIcon kind={now.icon} />
      <span className="wt">{now.temp}°</span>
      <span className="wl">{now.label}</span>
    </div>
  );
}

/* ---------------- up next ---------------- */

const minutesNow = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

/**
 * The one thing everybody opens the app for.
 *
 * Picks the shift happening right now if there is one, otherwise the next one
 * coming. A month grid of dots can answer this, but only after you read it.
 */
export function UpNext({ shifts, me }) {
  const today = todayIso();
  const nowMin = minutesNow();

  const mine = (shifts ?? [])
    .filter((s) => s.staff_id === me.id && s.shift_date >= today)
    .sort((a, b) => (a.shift_date + a.start_time).localeCompare(b.shift_date + b.start_time));

  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  const onNow = mine.find(
    (s) => s.shift_date === today && toMin(s.start_time) <= nowMin && toMin(s.end_time) > nowMin,
  );
  const next = onNow ?? mine.find((s) => s.shift_date > today || toMin(s.start_time) > nowMin);

  if (!next) {
    return (
      <div className="upnext none">
        <span className="un-label">Up next</span>
        <strong>Nothing scheduled</strong>
        <span className="un-sub">You have no upcoming shifts on the roster.</span>
      </div>
    );
  }

  const when = () => {
    if (onNow) {
      const left = toMin(next.end_time) - nowMin;
      const h = Math.floor(left / 60);
      return `On now — ${h >= 1 ? `${h}h ${left % 60}m` : `${left}m`} to go`;
    }
    if (next.shift_date === today) {
      const until = toMin(next.start_time) - nowMin;
      const h = Math.floor(until / 60);
      return `Today — starts in ${h >= 1 ? `${h}h ${until % 60}m` : `${until}m`}`;
    }
    const days = Math.round((parseIso(next.shift_date) - parseIso(today)) / 86400000);
    if (days === 1) return "Tomorrow";
    return parseIso(next.shift_date).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "short" });
  };

  return (
    <div className={`upnext${onNow ? " live" : ""}`}>
      <span className="un-label">
        {onNow && <i className="pulse" aria-hidden="true" />}
        Up next
      </span>
      <strong>{fmtTime(next.start_time)} – {fmtTime(next.end_time)}</strong>
      <span className="un-when">{when()}</span>
      <span className="un-meta">
        <PinIcon size={13} /> {next.location.name} · {next.role.name}
      </span>
    </div>
  );
}

/* ---------------- quote ---------------- */

// Steady rather than saccharine — this sits in a mental health clinic, and a
// shrill motivational line every morning would wear thin fast.
const QUOTES = [
  ["Nothing is softer or more flexible than water, yet nothing can resist it.", "Lao Tzu"],
  ["It does not matter how slowly you go, so long as you do not stop.", "Confucius"],
  ["No one has ever become poor by giving.", "Anne Frank"],
  ["Very little is needed to make a happy life; it is all within yourself.", "Marcus Aurelius"],
  ["The best way out is always through.", "Robert Frost"],
  ["What we achieve inwardly will change outer reality.", "Plutarch"],
  ["Be curious, not judgmental.", "Walt Whitman"],
  ["We don't have to do all of it alone. We were never meant to.", "Brené Brown"],
  ["Rest is not idleness.", "John Lubbock"],
  ["The quieter you become, the more you can hear.", "Ram Dass"],
  ["Everything that is done in the world is done by hope.", "Martin Luther"],
  ["He who has a why to live can bear almost any how.", "Friedrich Nietzsche"],
  ["Kindness is a language the deaf can hear and the blind can see.", "Mark Twain"],
  ["Attention is the rarest and purest form of generosity.", "Simone Weil"],
];

export function QuoteOfTheDay() {
  // same quote for everyone all day, a new one tomorrow
  const d = new Date();
  const dayNumber = Math.floor(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000,
  );
  const [text, who] = QUOTES[dayNumber % QUOTES.length];
  return (
    <figure className="quote">
      <blockquote>{text}</blockquote>
      <figcaption>{who}</figcaption>
    </figure>
  );
}
