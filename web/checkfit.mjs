/* Layout guard: fails if any screen scrolls sideways or has a tap target
 * smaller than 44px, at the narrowest phone width we care about.
 * Dev tool, not shipped. Needs playwright locally (see preview.mjs).
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const DIST = new URL("./dist/", import.meta.url).pathname;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".webmanifest": "application/manifest+json" };

const server = createServer(async (req, res) => {
  const p = normalize(decodeURIComponent(req.url.split("?")[0]));
  const file = join(DIST, p === "/" ? "index.html" : p);
  try {
    const b = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(b);
  } catch {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(await readFile(join(DIST, "index.html")));
  }
});
await new Promise((r) => server.listen(4175, r));

const ORG = { id: "o1", slug: "mm", name: "The Mood & Mind Centre", short_name: "M&M" };
const STAFF = [
  { id: "s1", name: "Carla Mendes", contract_hours: 30, is_admin: true, active: true },
  { id: "s2", name: "Sofia Lindqvist", contract_hours: 15, is_admin: false, active: true },
];
const LOCS = [{ id: "l1", name: "Rooms" }];
const ROLES = [{ id: "r1", name: "Centre admin" }];
const day = (n) => {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const PAYLOAD = {
  shifts: [{
    id: "i1", staff_id: "s1", shift_date: day(0), start_time: "08:00:00", end_time: "13:00:00",
    status: "scheduled", location: LOCS[0], role: ROLES[0], staff: STAFF[0],
  }],
  unavailability: [],
  availability: [{ id: "a0", staff_id: "s1", staff: STAFF[0], day_of_week: 0, is_available: true, available_from: "08:00:00", available_to: "17:00:00", note: null }],
  offers: [],
  template: [{
    id: "t1", staff_id: "s1", day_of_week: 0, start_time: "08:00:00", end_time: "13:00:00",
    location_id: "l1", role_id: "r1", location: LOCS[0], role: ROLES[0], staff: STAFF[0],
  }],
  staff: STAFF, locations: LOCS, roles: ROLES,
  organisations: [{ ...ORG, staff_count: 2, domain: null }],
};

const browser = await chromium.launch({ executablePath: CHROME });
let failures = 0;

for (const width of [320, 360, 402]) {
  const ctx = await browser.newContext({ viewport: { width, height: 780 }, isMobile: true, hasTouch: true });
  await ctx.route("**/functions/v1/api/**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(PAYLOAD) }));
  await ctx.addInitScript(([org, staff]) => {
    localStorage.setItem("roster_session", JSON.stringify({ token: "f", staff, org }));
  }, [ORG, { id: "s1", name: "Carla Mendes", isAdmin: true, isPlatformAdmin: true }]);

  const page = await ctx.newPage();
  await page.goto("http://localhost:4175", { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  for (const tab of [null, "Availability", "Offers", "Admin"]) {
    if (tab) {
      await page.getByRole("button", { name: tab, exact: true }).first().click();
      await page.waitForTimeout(500);
    }
    const r = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const small = [];
      for (const el of document.querySelectorAll("button, a, input, select")) {
        const b = el.getBoundingClientRect();
        // ignore hidden and inline-in-text controls
        if (b.width === 0 || b.height === 0) continue;
        if (b.height < 32) small.push(`${el.tagName.toLowerCase()}.${(typeof el.className === "string" ? el.className : "").slice(0, 30)} h=${Math.round(b.height)}`);
      }
      // name what actually sticks out, so a failure is diagnosable
      const over = [];
      for (const el of document.querySelectorAll("*")) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        if (b.right > vw + 1) {
          over.push(`${el.tagName.toLowerCase()}.${(typeof el.className === "string" ? el.className : "").slice(0, 34)} right=${Math.round(b.right)}`);
        }
      }
      return { vw, scrollW: document.documentElement.scrollWidth, small: [...new Set(small)].slice(0, 6), over: over.slice(0, 6) };
    });
    const name = `${width}px ${tab ?? "Calendar"}`;
    if (r.scrollW > r.vw + 1) {
      console.log(`FAIL ${name}: scrolls sideways (${r.scrollW} > ${r.vw})`);
      for (const o of r.over) console.log(`       ↳ ${o}`);
      failures++;
    } else {
      console.log(`ok   ${name}`);
    }
    if (r.small.length) console.log(`     small targets: ${r.small.join(" | ")}`);
  }
  await ctx.close();
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} layout failure(s)` : "\nno horizontal overflow at any width");
process.exitCode = failures ? 1 : 0;
