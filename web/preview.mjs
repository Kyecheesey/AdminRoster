/* Screenshot harness.
 *
 * Serves the production build and drives it in Chromium with the Supabase API
 * stubbed out, so every screen can be reviewed — including the signed-in ones —
 * without touching real data. Not part of the app bundle.
 *
 *   node preview.mjs [outDir]
 *
 * Needs playwright available locally (`npm i -D playwright`) — deliberately not
 * a package.json dependency, so deploy builds never pull browser binaries.
 * Point CHROME_PATH at a Chromium build if the default location differs.
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdirSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const OUT = process.argv[2] ?? "/tmp/shots";
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const DIST = new URL("./dist/", import.meta.url).pathname;
const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json",
};

mkdirSync(OUT, { recursive: true });

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split("?")[0]));
  let file = join(DIST, path === "/" ? "index.html" : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(await readFile(join(DIST, "index.html")));
  }
});
await new Promise((r) => server.listen(4173, r));
const BASE = "http://localhost:4173";

/* ---------------- fake data ---------------- */
const ORG = { id: "o1", slug: "mm", name: "The Mood & Mind Centre", short_name: "M&M" };
const STAFF = [
  { id: "s1", name: "Carla Mendes", contract_hours: 30, is_admin: true, active: true },
  { id: "s2", name: "Irene Fletcher", contract_hours: 24, is_admin: true, active: true },
  { id: "s3", name: "Priya Raman", contract_hours: 38, is_admin: false, active: true },
  { id: "s4", name: "Tom Okafor", contract_hours: 20, is_admin: false, active: true },
  { id: "s5", name: "Sofia Lindqvist", contract_hours: 15, is_admin: false, active: true },
];
const LOCS = [{ id: "l1", name: "Rooms" }, { id: "l2", name: "Reception" }];
const ROLES = [{ id: "r1", name: "Centre admin" }, { id: "r2", name: "Mood clinic" }];

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const day = (n) => iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + n));

const shift = (id, sid, date, st, et, l = 0, r = 0, status = "scheduled") => ({
  id, staff_id: sid, shift_date: date, start_time: st, end_time: et, status,
  location: LOCS[l], role: ROLES[r], staff: STAFF.find((s) => s.id === sid),
});

const SHIFTS = [
  shift("i1", "s1", day(0), "08:00:00", "13:00:00"),
  shift("i2", "s3", day(0), "09:00:00", "17:00:00", 1, 1),
  shift("i3", "s4", day(0), "13:00:00", "18:00:00", 1, 0, "swapped"),
  shift("i4", "s1", day(1), "08:00:00", "16:00:00"),
  shift("i5", "s2", day(2), "10:00:00", "15:00:00", 1, 1),
  shift("i6", "s1", day(3), "08:00:00", "13:00:00"),
  shift("i7", "s5", day(4), "12:00:00", "17:00:00", 0, 1),
  shift("i8", "s1", day(5), "09:00:00", "14:00:00"),
];

const TEMPLATE = [
  { id: "t1", staff_id: "s1", day_of_week: 0, start_time: "08:00:00", end_time: "13:00:00", location_id: "l1", role_id: "r1", location: LOCS[0], role: ROLES[0], staff: STAFF[0] },
  { id: "t2", staff_id: "s3", day_of_week: 0, start_time: "09:00:00", end_time: "17:00:00", location_id: "l2", role_id: "r2", location: LOCS[1], role: ROLES[1], staff: STAFF[2] },
  { id: "t7", staff_id: "s2", day_of_week: 0, start_time: "07:30:00", end_time: "12:00:00", location_id: "l2", role_id: "r1", location: LOCS[1], role: ROLES[0], staff: STAFF[1] },
  { id: "t8", staff_id: "s4", day_of_week: 0, start_time: "12:30:00", end_time: "18:30:00", location_id: "l1", role_id: "r2", location: LOCS[0], role: ROLES[1], staff: STAFF[3] },
  { id: "t9", staff_id: "s5", day_of_week: 0, start_time: "10:00:00", end_time: "14:30:00", location_id: "l1", role_id: "r1", location: LOCS[0], role: ROLES[0], staff: STAFF[4] },
  { id: "t3", staff_id: "s4", day_of_week: 1, start_time: "13:00:00", end_time: "18:00:00", location_id: "l2", role_id: "r1", location: LOCS[1], role: ROLES[0], staff: STAFF[3] },
  { id: "t4", staff_id: "s2", day_of_week: 2, start_time: "10:00:00", end_time: "15:00:00", location_id: "l1", role_id: "r2", location: LOCS[0], role: ROLES[1], staff: STAFF[1] },
  { id: "t5", staff_id: "s1", day_of_week: 3, start_time: "08:00:00", end_time: "16:00:00", location_id: "l1", role_id: "r1", location: LOCS[0], role: ROLES[0], staff: STAFF[0] },
  { id: "t6", staff_id: "s5", day_of_week: 4, start_time: "12:00:00", end_time: "17:00:00", location_id: "l1", role_id: "r2", location: LOCS[0], role: ROLES[1], staff: STAFF[4] },
];

const OFFERS = [
  {
    id: "of1", status: "open", offered_by: "s3", accepted_by: null, shift_instance_id: "i2",
    offer_note: "Dentist appointment I couldn't move, sorry!", admin_note: null,
    shift: SHIFTS[1], offerer: STAFF[2], acceptor: null,
  },
  {
    id: "of2", status: "pending_approval", offered_by: "s4", accepted_by: "s5", shift_instance_id: "i3",
    offer_note: null, admin_note: null,
    shift: SHIFTS[2], offerer: STAFF[3], acceptor: STAFF[4],
  },
  {
    id: "of3", status: "approved", offered_by: "s5", accepted_by: "s3", shift_instance_id: "i7",
    offer_note: null, admin_note: "Fine by me.", shift: SHIFTS[6], offerer: STAFF[4], acceptor: STAFF[2],
  },
];

const TIMEOFF = [
  { id: "u1", staff_id: "s3", staff: STAFF[2], start_date: day(12), end_date: day(19), note: "Family holiday", status: "pending", admin_note: null },
  { id: "u2", staff_id: "s4", staff: STAFF[3], start_date: day(30), end_date: day(30), note: "Medical", status: "pending", admin_note: null },
  { id: "u3", staff_id: "s5", staff: STAFF[4], start_date: day(-6), end_date: day(-4), note: "", status: "approved", admin_note: "Enjoy!" },
];

const AVAIL = STAFF.flatMap((s) =>
  [0, 1, 2, 3, 4].map((d) => ({
    id: `${s.id}-${d}`, staff_id: s.id, staff: s, day_of_week: d,
    is_available: !(s.id === "s5" && d > 2), available_from: "08:00:00", available_to: "17:00:00", note: null,
  })),
);

const ROUTES = [
  [/\/resolve-org/, () => ({ org: ORG })],
  [/\/bootstrap/, () => ({ staff: STAFF.map(({ id, name }) => ({ id, name })) })],
  [/\/meta/, () => ({ locations: LOCS, roles: ROLES, staff: STAFF })],
  [/\/calendar/, () => ({ shifts: SHIFTS, unavailability: [{ id: "u3", staff: STAFF[4], start_date: day(-6), end_date: day(-4), note: "" }] })],
  [/\/availability/, () => ({ availability: AVAIL })],
  [/\/unavailability/, () => ({ unavailability: TIMEOFF })],
  [/\/offers/, () => ({ offers: OFFERS })],
  [/\/admin\/template/, () => ({ template: TEMPLATE })],
  [/\/platform\/orgs/, () => ({ organisations: [{ ...ORG, staff_count: 5, domain: "moodandmind.example" }] })],
];

/* ---------------- drive ---------------- */
const browser = await chromium.launch({ executablePath: CHROME });

async function shoot(name, { width, height, tab, signedIn = true, full = true, clip }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    isMobile: width < 920,
    hasTouch: width < 920,
  });
  await ctx.route("**/functions/v1/api/**", async (route) => {
    const url = route.request().url();
    const hit = ROUTES.find(([re]) => re.test(url));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(hit ? hit[1]() : {}),
    });
  });
  if (signedIn) {
    await ctx.addInitScript(
      ([org, staff]) => {
        localStorage.setItem(
          "roster_session",
          JSON.stringify({ token: "fake", staff, org }),
        );
      },
      [ORG, { id: "s1", name: "Carla Mendes", isAdmin: true, isPlatformAdmin: true }],
    );
  }
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  if (tab) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(500);
  if (clip) {
    // isolate one component so its detail is legible at review size
    await page.getByRole("tab", { name: clip.day }).click();
    await page.waitForTimeout(350);
    await page.locator(".tl-wrap").screenshot({ path: `${OUT}/${name}.png` });
  } else {
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  }
  console.log(`${name}.png  ${width}x${height}`);
  await ctx.close();
}

const M = { width: 402, height: 874 };
const D = { width: 1440, height: 950 };

await shoot("login-mobile", { ...M, signedIn: false, full: false });
await shoot("calendar-mobile", { ...M });
await shoot("offers-mobile", { ...M, tab: "Offers" });
await shoot("availability-mobile", { ...M, tab: "Availability" });
await shoot("admin-mobile", { ...M, tab: "Admin" });
await shoot("timeline-desktop", { ...D, tab: "Admin", clip: { day: /Mon/ } });
await shoot("timeline-mobile", { ...M, tab: "Admin", clip: { day: /Mon/ } });
await shoot("calendar-desktop", { ...D, full: false });
await shoot("offers-desktop", { ...D, tab: "Offers", full: false });
await shoot("admin-desktop", { ...D, tab: "Admin" });

await browser.close();
server.close();
