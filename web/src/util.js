export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayIso() {
  return iso(new Date());
}

export function parseIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s, n) {
  const d = parseIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

// 0=Monday .. 6=Sunday
export function dowOf(s) {
  return (parseIso(s).getDay() + 6) % 7;
}

export function fmtTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function fmtDate(s) {
  const d = parseIso(s);
  return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
}

// the Sunday that ends the week containing `from` (roster "week ending" anchor)
export function weekEndingIso(fromIso = todayIso()) {
  return addDays(fromIso, 6 - dowOf(fromIso));
}

// "26 May" — the day/month for a date, used under weekday headers
export function dayMonth(s) {
  const d = parseIso(s);
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function fmtDateLong(s) {
  const d = parseIso(s);
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// Muted, evenly-spaced hues that sit calmly beside the brand instead of
// shouting over it. Every one of these clears 4.5:1 against the white initials
// — the old brighter set (amber, hot pink) did not.
const AVATAR_COLORS = [
  "#0d7c6a", "#35708f", "#96577a", "#9c6b2e",
  "#47795a", "#a5573f", "#5c62a0", "#62753c",
];

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function avatarColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// split "13:30:00" -> ["1:30", "PM"]
export function timeParts(t) {
  if (!t) return ["", ""];
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return [`${h12}:${String(m).padStart(2, "0")}`, ampm];
}

/* ---------- shift recurrence ----------
 * A mirror of occursOn() in supabase/functions/api/index.ts. The server decides
 * which shifts actually get created; this lets the roster show the same answer
 * before you press Build. If you change one, change both — audit.mjs checks a
 * table of cases against this copy.
 */

export const FREQUENCIES = [
  { id: "weekly", label: "Every week" },
  { id: "fortnightly", label: "Every 2 weeks" },
  { id: "daily", label: "Every day" },
  { id: "monthly_date", label: "Monthly (same date)" },
  { id: "monthly_weekday", label: "Monthly (same weekday)" },
  { id: "once", label: "One-off (single date)" },
];

// frequencies that are meaningless without a date to count from
export const NEEDS_DATE = ["once", "fortnightly", "monthly_date", "monthly_weekday"];

export const freqLabel = (id) => FREQUENCIES.find((f) => f.id === id)?.label ?? "Every week";

const dayOfMonth = (d) => Number(d.slice(8, 10));

function daysInMonth(d) {
  const [y, m] = d.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

const nthWeekdayOfMonth = (d) => Math.floor((dayOfMonth(d) - 1) / 7) + 1;

function weeksBetween(a, b) {
  const monday = (s) => parseIso(addDays(s, -dowOf(s))).getTime();
  return Math.round((monday(b) - monday(a)) / (7 * 86400000));
}

export function occursOn(t, date) {
  if (t.start_date && date < t.start_date) return false;
  if (t.end_date && date > t.end_date) return false;
  const dow = dowOf(date);

  switch (t.frequency ?? "weekly") {
    case "once":
      return Boolean(t.start_date) && date === t.start_date;
    case "daily":
      return true;
    case "fortnightly":
      if (dow !== t.day_of_week) return false;
      if (!t.start_date) return true;
      return weeksBetween(t.start_date, date) % 2 === 0;
    case "monthly_date": {
      if (!t.start_date) return false;
      const target = Math.min(dayOfMonth(t.start_date), daysInMonth(date));
      return dayOfMonth(date) === target;
    }
    case "monthly_weekday":
      if (!t.start_date) return false;
      return dow === dowOf(t.start_date) &&
        nthWeekdayOfMonth(date) === nthWeekdayOfMonth(t.start_date);
    case "weekly":
    default:
      return dow === t.day_of_week;
  }
}

// "HH:MM" (or "HH:MM:SS") -> minutes since midnight
export function toMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Colour-code shifts by role, the way a wall roster does — one glance tells you
// which part of the business is covered. Stable per role name.
const ROLE_COLORS = [
  { bar: "#1d9c7f", ink: "#ffffff", soft: "#e3f4ef" },
  { bar: "#4a7fb5", ink: "#ffffff", soft: "#e8f0f8" },
  { bar: "#b5678c", ink: "#ffffff", soft: "#f8eaf1" },
  { bar: "#c08a35", ink: "#ffffff", soft: "#fbf0dd" },
  { bar: "#5f8f5f", ink: "#ffffff", soft: "#ecf3ec" },
  { bar: "#a86249", ink: "#ffffff", soft: "#f8ece7" },
  { bar: "#6b6fa8", ink: "#ffffff", soft: "#eeeef8" },
  { bar: "#7d8a3f", ink: "#ffffff", soft: "#f1f3e4" },
];

export function roleColor(name = "") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return ROLE_COLORS[h % ROLE_COLORS.length];
}

// Chip styling for a role, drawn from the same source as the timeline bars so
// a role is the same colour wherever it appears. It used to be decided by a
// substring test for "mood", which meant the roster and the timeline disagreed
// about what colour a given role was.
export function roleChipStyle(name = "") {
  const c = roleColor(name);
  return { background: c.soft, color: c.bar };
}

export function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 6) / 10;
}
