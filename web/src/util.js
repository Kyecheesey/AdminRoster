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

export function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 6) / 10;
}
