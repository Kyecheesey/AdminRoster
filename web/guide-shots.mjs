/* Screens for the RosterME how-to guide.
 *
 * Drives the real production build against a stubbed API, so every figure in
 * the guide is the actual interface rather than a mock-up that will quietly go
 * out of date. Uses the clinic's own names, sites and roles so staff recognise
 * what they are looking at.
 *
 *   cd web && npm run build && node guide-shots.mjs [outDir]
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const OUT = process.argv[2] ?? "/tmp/guide-shots";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const DIST = new URL("./dist/", import.meta.url).pathname;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
};

mkdirSync(OUT, { recursive: true });

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split("?")[0]));
  const file = join(DIST, path === "/" ? "index.html" : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(await readFile(join(DIST, "index.html")));
  }
});
await new Promise((r) => server.listen(4174, r));
const BASE = "http://localhost:4174";

/* ---------------- the clinic, as it actually is ---------------- */

const ORG = { id: "o1", slug: "mm", name: "The Mood & Mind Centre", short_name: "M&M" };
const STAFF = [
  { id: "s1", name: "Carla Lartigau", contract_hours: 30, is_admin: true, active: true },
  { id: "s2", name: "Irene", contract_hours: 0, is_admin: true, active: true },
  { id: "s3", name: "Debbie Halsey", contract_hours: 38, is_admin: false, active: true },
  { id: "s4", name: "Cass Reid", contract_hours: 38, is_admin: false, active: true },
  { id: "s5", name: "Madelyn Ruel", contract_hours: 30, is_admin: false, active: true },
  { id: "s6", name: "Momo Segawa", contract_hours: 30, is_admin: false, active: true },
  { id: "s7", name: "Ellenor", contract_hours: 30, is_admin: false, active: true },
];
const LOCS = [{ id: "l1", name: "Hope Island" }, { id: "l2", name: "Upper Coomera" }];
const ROLES = [{ id: "r1", name: "Centre Admin" }, { id: "r2", name: "Mood Admin" }];

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const day = (n) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));

const shift = (id, sid, date, st, et, l = 0, r = 0, status = "scheduled") => ({
  id, staff_id: sid, shift_date: date, start_time: st, end_time: et, status,
  location: LOCS[l], role: ROLES[r], staff: STAFF.find((s) => s.id === sid),
});

// Debbie's real pattern, plus enough around it that the screens look like a
// working week rather than an empty demo
const SHIFTS = [
  shift("i1", "s1", day(0), "08:00:00", "13:00:00"),
  shift("i2", "s3", day(0), "08:00:00", "13:00:00"),
  shift("i3", "s3", day(0), "13:30:00", "16:30:00"),
  shift("i4", "s4", day(0), "09:00:00", "17:00:00", 1, 1),
  shift("i5", "s1", day(1), "08:00:00", "16:00:00"),
  shift("i6", "s3", day(1), "08:00:00", "12:30:00"),
  shift("i7", "s5", day(2), "10:00:00", "15:00:00", 1, 1),
  shift("i8", "s3", day(2), "08:00:00", "13:00:00"),
  shift("i9", "s1", day(3), "08:00:00", "13:00:00"),
  shift("i10", "s6", day(4), "12:00:00", "17:00:00", 0, 1),
  shift("i11", "s1", day(5), "09:00:00", "14:00:00"),
];

const TEMPLATE = [
  ["t1", "s3", 0, "08:00:00", "13:00:00", 0, 0], ["t2", "s3", 0, "13:30:00", "16:30:00", 0, 0],
  ["t3", "s4", 0, "09:00:00", "17:00:00", 1, 1], ["t4", "s1", 0, "08:00:00", "13:00:00", 0, 0],
  ["t5", "s3", 1, "08:00:00", "12:30:00", 0, 0], ["t6", "s3", 1, "13:00:00", "16:00:00", 0, 0],
  ["t7", "s5", 1, "10:00:00", "15:00:00", 1, 1],
  ["t8", "s3", 2, "08:00:00", "13:00:00", 0, 0], ["t9", "s3", 2, "13:30:00", "16:00:00", 0, 0],
  ["t10", "s3", 3, "08:00:00", "13:00:00", 0, 0], ["t11", "s6", 3, "12:00:00", "17:00:00", 0, 1],
  ["t12", "s3", 4, "08:00:00", "13:00:00", 0, 0], ["t13", "s7", 4, "09:00:00", "14:00:00", 1, 0],
].map(([id, sid, dow, st, et, l, r]) => ({
  id, staff_id: sid, day_of_week: dow, start_time: st, end_time: et,
  location_id: LOCS[l].id, role_id: ROLES[r].id,
  location: LOCS[l], role: ROLES[r], staff: STAFF.find((s) => s.id === sid),
  frequency: "weekly", start_date: null, end_date: null,
}));

const OFFERS = [
  {
    id: "of1", status: "open", offered_by: "s4", accepted_by: null, shift_instance_id: "i4",
    offer_note: "Dentist appointment I couldn't move, sorry!", admin_note: null,
    shift: SHIFTS[3], offerer: STAFF[3], acceptor: null,
  },
  {
    id: "of2", status: "pending_approval", offered_by: "s5", accepted_by: "s6", shift_instance_id: "i7",
    offer_note: null, admin_note: null,
    shift: SHIFTS[6], offerer: STAFF[4], acceptor: STAFF[5],
  },
];

const TIMEOFF = [
  { id: "u1", staff_id: "s5", staff: STAFF[4], start_date: day(12), end_date: day(19), note: "Family holiday", status: "pending", admin_note: null },
  { id: "u2", staff_id: "s6", staff: STAFF[5], start_date: day(30), end_date: day(30), note: "Medical", status: "pending", admin_note: null },
];
// what the signed-in person sees on their own Availability page
const MY_TIMEOFF = [
  { id: "u9", staff_id: "s1", staff: STAFF[0], start_date: day(21), end_date: day(25), note: "Annual leave", status: "pending", admin_note: null },
];

const AVAIL = STAFF.flatMap((s) =>
  [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    id: `${s.id}-${d}`, staff_id: s.id, staff: s, day_of_week: d,
    is_available: d < 5, available_from: "08:00:00", available_to: d === 4 ? "14:00:00" : "19:00:00",
    note: null,
  })),
);

// Production only resolves a workplace from a real clinic domain, so the
// probe against localhost must miss — otherwise the app skips the code-entry
// screen the guide needs to show.
const ROUTES = [
  [/\/resolve-org/, (url) => {
    const q = (new URL(url).searchParams.get("q") ?? "").toLowerCase();
    return ["mm", "moodandmind"].includes(q)
      ? { org: ORG }
      : { status: 404, body: { error: "No workplace found for that address" } };
  }],
  [/\/bootstrap/, () => ({ org: ORG, staff: STAFF.map(({ id, name }) => ({ id, name })) })],
  [/\/meta/, () => ({ locations: LOCS, roles: ROLES, staff: STAFF })],
  [/\/calendar-token/, () => ({ token: "8f14e45f-ceea-467a-9c1b-7c0a3f2b91de" })],
  [/\/calendar\?/, () => ({ shifts: SHIFTS, unavailability: [] })],
  [/\/availability/, () => ({ availability: AVAIL })],
  [/\/unavailability\?all=1/, () => ({ unavailability: TIMEOFF })],
  [/\/unavailability/, () => ({ unavailability: MY_TIMEOFF })],
  [/\/offers/, () => ({ offers: OFFERS })],
  [/\/admin\/template/, () => ({ template: TEMPLATE })],
];

/* ---------------- drive ---------------- */

const browser = await chromium.launch({ executablePath: CHROME });

async function screen({ name, width, height, signedIn = true, admin = true, tab, steps, clip, viewportOnly }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 920,
    hasTouch: width < 920,
  });
  await ctx.route("**/functions/v1/api/**", async (route) => {
    const url = route.request().url();
    const hit = ROUTES.find(([re]) => re.test(url));
    const r = hit ? hit[1](url) : {};
    await route.fulfill({
      status: r.status ?? 200,
      contentType: "application/json",
      body: JSON.stringify(r.status ? r.body : r),
    });
  });
  if (signedIn) {
    await ctx.addInitScript(
      ([org, staff]) => localStorage.setItem("roster_session", JSON.stringify({ token: "fake", staff, org })),
      [ORG, { id: "s1", name: "Carla Lartigau", isAdmin: admin, isPlatformAdmin: false }],
    );
  }
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  if (tab) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await page.waitForTimeout(700);
  }
  if (steps) await steps(page);
  await page.waitForTimeout(450);

  // A full-height phone screen can be four times taller than it is wide, which
  // is taller than an A4 page once placed in the guide. Those are captured as
  // the visible screen instead.
  const target = viewportOnly || !clip ? page : page.locator(clip).first();
  await target.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${name}.png`);
  await ctx.close();
}

const PHONE = { width: 402, height: 860 };
const DESK = { width: 1440, height: 940 };

/* --- signing in --- */
await screen({ name: "login-workplace", ...PHONE, signedIn: false, clip: ".login" });
await screen({
  name: "login-pin", ...PHONE, signedIn: false, clip: ".login",
  steps: async (p) => {
    await p.locator(".entry-input").fill("mm");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.waitForTimeout(600);
    await p.getByRole("button", { name: "Carla" }).first().click();
    await p.waitForTimeout(400);
    await p.getByRole("button", { name: "1", exact: true }).click();
    await p.getByRole("button", { name: "2", exact: true }).click();
  },
});

/* --- everyday use --- */
await screen({ name: "dashboard-phone", ...PHONE, viewportOnly: true });
await screen({ name: "dashboard-desktop", ...DESK, clip: ".dash" });
await screen({ name: "availability", ...PHONE, tab: "Availability", clip: ".av-grid .card:first-child" });
await screen({ name: "timeoff-request", ...PHONE, tab: "Availability", clip: ".av-grid .card:nth-child(2)" });
await screen({ name: "calendar-sync", ...PHONE, tab: "Availability", clip: ".cal-sync, .plain-page > .card:last-child" });
await screen({ name: "offers", ...PHONE, tab: "Offers", clip: ".plain-page" });

/* --- administration --- */
await screen({ name: "admin-build", ...DESK, tab: "Admin", clip: ".plain-page .card:has(.copy-row), .plain-page > .card" });
await screen({
  name: "admin-editor", ...DESK, tab: "Admin", clip: ".modal",
  steps: async (p) => {
    await p.getByRole("button", { name: /Add/ }).first().click();
    await p.waitForTimeout(500);
  },
});
await screen({ name: "admin-roster", ...DESK, tab: "Admin", clip: ".tl-wrap" });
await screen({
  name: "admin-roster-day", ...DESK, tab: "Admin", clip: ".cards-grid",
  steps: async (p) => { await p.getByRole("button", { name: "By day", exact: true }).click(); await p.waitForTimeout(500); },
});
await screen({ name: "admin-timeoff", ...DESK, tab: "Admin", clip: "#sec-timeoff + .card, .card:has(.ua-badge)" });
await screen({ name: "admin-hours", ...DESK, tab: "Admin", clip: ".card:has(.balance-row)" });

await browser.close();
server.close();
console.log(`\n${OUT}`);
