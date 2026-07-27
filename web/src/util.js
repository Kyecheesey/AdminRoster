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

const AVATAR_COLORS = [
  "#0e9884", "#2f7fdb", "#e6739f", "#f59e0b",
  "#12a150", "#e8795a", "#0ea5b7", "#c98a2e",
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

export function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 6) / 10;
}
