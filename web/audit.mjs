import { chromium } from "playwright";
import { createServer } from "vite";

const OUT = "/tmp/claude-0/-home-user-AdminRoster/a4b4a2fb-ddf8-587e-a170-50af4b6e27dd/scratchpad";
const results = [];
const check = (name, cond) => {
  results.push(`${cond ? "PASS" : "FAIL"}: ${name}`);
  if (!cond) process.exitCode = 1;
};

// ---------- stateful mock backend ----------
const staff = [
  { id: "s1", name: "Admin Account" }, { id: "s2", name: "Gaylin Dally" },
  { id: "s3", name: "Cass Reid" }, { id: "s4", name: "Debbie Halsey" },
  { id: "s5", name: "Madelyn Ruel" }, { id: "s6", name: "Momo Segawa" },
  { id: "s7", name: "Carla Lartigau" },
];
const byId = Object.fromEntries(staff.map((s) => [s.id, s]));
const locName = { l1: "Hope Island", l2: "Upper Coomera" };
const roleName = { r1: "Centre Admin", r2: "Mood Admin" };
const org = { id: "o-mm", slug: "mm", name: "The Mood & Mind Centre", short_name: "M&M" };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = new Date();
const todayIso = iso(today);
const tmr = new Date(today); tmr.setDate(today.getDate() + 1);
const tmrIso = iso(tmr);

const state = {
  shifts: [
    { id: "sh1", staff_id: "s3", shift_date: todayIso, start_time: "08:00:00", end_time: "13:00:00", status: "scheduled", location: { name: "Hope Island" }, role: { name: "Centre Admin" } },
    { id: "sh2", staff_id: "s4", shift_date: todayIso, start_time: "08:00:00", end_time: "13:00:00", status: "scheduled", location: { name: "Hope Island" }, role: { name: "Mood Admin" } },
    { id: "sh3", staff_id: "s3", shift_date: tmrIso, start_time: "09:00:00", end_time: "14:00:00", status: "scheduled", location: { name: "Upper Coomera" }, role: { name: "Centre Admin" } },
  ],
  offers: [
    { id: "o1", shift_instance_id: "sh2", offered_by: "s4", accepted_by: null, status: "open", offer_note: "Appointment", admin_note: null, created_at: "2026-07-20T00:00:00Z", updated_at: "2026-07-20T00:00:00Z" },
  ],
  availability: [0, 1, 2, 3, 4].map((d) => ({ id: `a${d}`, staff_id: "s3", day_of_week: d, is_available: true, available_from: "08:00:00", available_to: "19:00:00", note: null })),
  unavailability: [
    { id: "uo1", staff_id: "s4", start_date: tmrIso, end_date: tmrIso, note: "Family holiday", status: "pending", admin_note: null },
  ],
  template: [
    { id: "t1", day_of_week: 0, start_time: "08:00:00", end_time: "13:00:00", staff_id: "s3", location_id: "l1", role_id: "r1", staff: { id: "s3", name: "Cass Reid" }, location: { name: "Hope Island" }, role: { name: "Centre Admin" } },
  ],
  posts: [],
  orgs: [{ id: "o-mm", slug: "mm", name: "The Mood & Mind Centre", short_name: "M&M", domain: null, staff_count: 8 }],
};

function offerView(o) {
  const shift = state.shifts.find((s) => s.id === o.shift_instance_id);
  return {
    ...o,
    shift: { ...shift },
    offerer: byId[o.offered_by],
    acceptor: o.accepted_by ? byId[o.accepted_by] : null,
  };
}

async function handle(route) {
  const url = new URL(route.request().url());
  const p = url.pathname.replace(/^.*\/api/, "");
  const method = route.request().method();
  const body = (method === "POST" || method === "PUT") ? JSON.parse(route.request().postData() || "{}") : {};
  const reply = (b, status = 200) => route.fulfill({ status, json: b, headers: { "Access-Control-Allow-Origin": "*" } });
  state.posts.push(`${method} ${p}`);

  if (p === "/resolve-org") {
    const q = (url.searchParams.get("q") || "").toLowerCase();
    if (q === "mm" || q === org.slug || q === org.domain) return reply({ org });
    return reply({ error: "No workplace found for that address" }, 404);
  }
  if (p === "/bootstrap") return reply({ org, staff: staff.map(({ id, name }) => ({ id, name })) });
  if (p === "/login") {
    if (body.pin !== "1234") return reply({ error: "Wrong PIN" }, 401);
    return reply({ token: "t.t", staff: { id: "s3", name: "Cass Reid", isAdmin: true, isPlatformAdmin: true }, org });
  }
  if (p === "/platform/orgs" && method === "GET")
    return reply({ organisations: state.orgs });
  if (p === "/platform/orgs" && method === "POST") {
    const o = { id: `o${state.orgs.length + 1}`, slug: (body.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: body.name, short_name: body.short_name, domain: body.domain, staff_count: 1 };
    state.orgs.push(o);
    return reply({ ok: true, org: o });
  }
  if (p === "/calendar") {
    return reply({
      shifts: state.shifts.filter((s) => s.status !== "cancelled").map((s) => ({ ...s, staff: byId[s.staff_id] })),
      unavailability: state.unavailability.filter((u) => (u.status || "approved") === "approved").map((u) => ({ ...u, staff: byId[u.staff_id] })),
    });
  }
  if (p === "/offers" && method === "GET") return reply({ offers: state.offers.map(offerView) });
  if (p === "/offers" && method === "POST") {
    state.offers.unshift({ id: `o${state.offers.length + 5}`, shift_instance_id: body.shiftInstanceId, offered_by: "s3", accepted_by: null, status: "open", offer_note: body.note || null, admin_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return reply({ ok: true });
  }
  const act = p.match(/^\/offers\/([\w-]+)\/(accept|cancel|approve|reject)$/);
  if (act && method === "POST") {
    const o = state.offers.find((x) => x.id === act[1]);
    if (!o) return reply({ error: "not found" }, 404);
    if (act[2] === "accept") { o.accepted_by = "s3"; o.status = "pending_approval"; }
    if (act[2] === "cancel") o.status = "cancelled";
    if (act[2] === "reject") o.status = "rejected";
    if (act[2] === "approve") {
      o.status = "approved";
      const sh = state.shifts.find((s) => s.id === o.shift_instance_id);
      sh.staff_id = o.accepted_by; sh.status = "swapped";
    }
    return reply({ ok: true });
  }
  if (p === "/availability" && method === "GET") return reply({ availability: state.availability.map((a) => ({ ...a, staff: byId[a.staff_id] })) });
  if (p === "/availability" && method === "POST") {
    for (const d of body.days) {
      const row = state.availability.find((a) => a.day_of_week === d.day_of_week);
      if (row) Object.assign(row, d);
      else state.availability.push({ id: `an${d.day_of_week}`, staff_id: "s3", ...d });
    }
    return reply({ ok: true });
  }
  if (p === "/unavailability" && method === "GET") {
    const all = url.searchParams.get("all") === "1";
    const rows = all ? state.unavailability : state.unavailability.filter((u) => u.staff_id === "s3");
    return reply({ unavailability: rows.map((u) => ({ ...u, staff: byId[u.staff_id] })) });
  }
  if (p === "/unavailability" && method === "POST") {
    state.unavailability.push({ id: `u${state.unavailability.length + 1}`, staff_id: "s3", status: "pending", admin_note: null, ...body });
    return reply({ ok: true });
  }
  const uar = p.match(/^\/unavailability\/([\w-]+)\/(approve|deny)$/);
  if (uar && method === "POST") {
    const u = state.unavailability.find((x) => x.id === uar[1]);
    if (u) { u.status = uar[2] === "approve" ? "approved" : "denied"; u.admin_note = body.note || null; }
    return reply({ ok: true });
  }
  if (p === "/unavailability" && method === "DELETE") {
    state.unavailability = state.unavailability.filter((u) => u.id !== url.searchParams.get("id"));
    return reply({ ok: true });
  }
  if (p === "/meta") return reply({
    locations: [{ id: "l1", name: "Hope Island" }, { id: "l2", name: "Upper Coomera" }],
    roles: [{ id: "r1", name: "Centre Admin" }, { id: "r2", name: "Mood Admin" }],
    staff: staff.map((s, i) => ({ ...s, contract_hours: 30, is_admin: i === 0, active: true })),
  });
  if (p === "/admin/template" && method === "GET") return reply({ template: state.template });
  if (p === "/admin/template" && method === "POST") {
    state.template.push({ id: `t${state.template.length + 1}`, day_of_week: Number(body.day_of_week), start_time: body.start_time + ":00", end_time: body.end_time + ":00", staff_id: body.staff_id, location_id: body.location_id, role_id: body.role_id, staff: byId[body.staff_id], location: { name: locName[body.location_id] }, role: { name: roleName[body.role_id] } });
    return reply({ ok: true });
  }
  if (p === "/admin/template" && method === "PUT") {
    const t = state.template.find((x) => x.id === body.id);
    if (!t) return reply({ error: "not found" }, 404);
    Object.assign(t, {
      day_of_week: Number(body.day_of_week), start_time: body.start_time + ":00", end_time: body.end_time + ":00",
      staff_id: body.staff_id, location_id: body.location_id, role_id: body.role_id,
      staff: byId[body.staff_id], location: { name: locName[body.location_id] }, role: { name: roleName[body.role_id] },
    });
    return reply({ ok: true });
  }
  if (p === "/admin/template" && method === "DELETE") {
    state.template = state.template.filter((t) => t.id !== url.searchParams.get("id"));
    return reply({ ok: true });
  }
  if (p === "/admin/regenerate") return reply({ ok: true });
  if (p === "/admin/staff") return reply({ ok: true });
  if (p === "/change-pin" && method === "POST") {
    if (!/^\d{4}$/.test(body.pin ?? "")) return reply({ error: "PIN must be exactly 4 digits" }, 400);
    state.changedPin = body.pin;
    return reply({ ok: true });
  }
  return reply({ error: `unhandled ${method} ${p}` }, 500);
}

// ---------- run ----------
const server = await createServer({ root: "/home/user/AdminRoster/web", server: { port: 5199 } });
await server.listen();
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => {
  // ignore network noise, the deliberate wrong-PIN 401, and the expected 404
  // when the hostname doesn't map to a workplace (login falls back to entry)
  if (m.type() === "error" && !m.text().includes("net::") && !m.text().includes("401") && !m.text().includes("404")) errors.push(m.text());
});
await page.route("**/functions/v1/api/**", handle);

// 1. login: enter workplace code, wrong PIN then right PIN
await page.goto("http://localhost:5199/");
await page.getByPlaceholder(/rosterme\.app/).fill("mm");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(400);
check("workplace resolves by code", await page.getByRole("button", { name: /Cass/ }).isVisible());
await page.getByRole("button", { name: /Cass/ }).click();
for (const d of "9999") await page.getByRole("button", { name: d, exact: true }).click();
await page.waitForTimeout(500);
check("wrong PIN shows error", await page.getByText("Wrong PIN").isVisible());
for (const d of "1234") await page.getByRole("button", { name: d, exact: true }).click();
await page.waitForTimeout(700);
check("login lands on calendar", await page.getByRole("button", { name: "My shifts" }).isVisible());

// 2. calendar: shift visible, offer from calendar
await page.locator(".shift-who .name", { hasText: "Cass Reid" }).first().waitFor({ timeout: 5000 });
check("today's own shift listed", await page.locator(".shift-who .name", { hasText: "Cass Reid" }).first().isVisible());
await page.getByRole("button", { name: "Offer swap" }).first().click();
await page.waitForTimeout(300);
await page.getByPlaceholder(/Note \(optional\)/).fill("test offer");
await page.getByRole("button", { name: "Offer shift" }).click();
await page.waitForTimeout(500);
check("offer created via calendar", state.offers.some((o) => o.shift_instance_id === "sh1" && o.status === "open"));

// 3. month navigation
await page.getByLabel("Next month").click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Today" }).click();
await page.waitForTimeout(400);

// 4. offers: accept Debbie's open offer, then approve it (we're admin)
await page.getByRole("button", { name: "Offers" }).click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "Take this shift" }).click();
await page.waitForTimeout(400);
check("accept -> pending_approval", state.offers.find((o) => o.id === "o1").status === "pending_approval");
await page.getByRole("button", { name: "Approve" }).click();
await page.waitForTimeout(400);
const o1 = state.offers.find((o) => o.id === "o1");
check("approve -> approved + shift reassigned", o1.status === "approved" && state.shifts.find((s) => s.id === "sh2").staff_id === "s3");

// 5. withdraw own open offer
await page.getByRole("button", { name: "Withdraw" }).first().click();
await page.waitForTimeout(400);
check("withdraw cancels own offer", state.offers.some((o) => o.shift_instance_id === "sh1" && o.status === "cancelled"));

// 6. FAB offer picker opens
await page.getByLabel("Offer a shift").click();
await page.waitForTimeout(400);
check("offer picker modal opens", await page.getByText("Offer a shift for swap").isVisible());
await page.getByRole("button", { name: "Cancel" }).click();
await page.waitForTimeout(200);

// 7. availability: toggle Saturday on, save
await page.getByRole("button", { name: "Availability" }).click();
await page.waitForTimeout(500);
await page.locator(".avail-day").nth(5).locator(".track").click();
await page.waitForTimeout(200);
await page.getByRole("button", { name: "Save availability" }).click();
await page.waitForTimeout(500);
check("availability saved (Sat on)", state.availability.find((a) => a.day_of_week === 5)?.is_available === true);

// 8. time off add + remove
await page.locator('input[type="date"]').first().fill(tmrIso);
await page.locator('input[type="date"]').nth(1).fill(tmrIso);
await page.getByPlaceholder("Reason (optional)").fill("dentist");
await page.getByRole("button", { name: "Add", exact: true }).click();
await page.waitForTimeout(500);
check("time off added", state.unavailability.filter((u) => u.staff_id === "s3").length === 1);
await page.getByRole("button", { name: "Remove" }).first().click();
await page.waitForTimeout(400);
check("time off removed", state.unavailability.filter((u) => u.staff_id === "s3").length === 0);

// 9. admin: add a shift via the editor modal
await page.getByRole("button", { name: "Admin" }).click();
await page.waitForTimeout(500);
await page.getByRole("button", { name: "+ New shift" }).click();
await page.waitForTimeout(300);
const modal = page.locator(".modal");
check("editor opens on add", await page.getByRole("heading", { name: "Add shift" }).isVisible());
check("add is disabled until valid", await modal.getByRole("button", { name: "Add shift", exact: true }).isDisabled());
await modal.locator("select").nth(0).selectOption({ label: "Momo Segawa" });
await modal.locator("select").nth(1).selectOption({ label: "Tuesday" });
await modal.locator("select").nth(2).selectOption({ label: "Upper Coomera" });
await modal.locator("select").nth(3).selectOption({ label: "Centre Admin" });
await modal.getByRole("button", { name: "Add shift", exact: true }).click();
await page.waitForTimeout(500);
check("template shift added", state.template.length === 2 && state.template[1].staff_id === "s6");

// 9b. admin: edit an existing shift's time via the editor (PUT)
await page.locator(".shift-chip").first().click();
await page.waitForTimeout(300);
check("editor opens on edit", await page.getByRole("heading", { name: "Edit shift" }).isVisible());
await modal.locator('input[type="time"]').nth(1).fill("15:30");
await modal.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(500);
check("template shift edited (PUT)", state.template.find((t) => t.id === "t1").end_time === "15:30:00");

// 9c. editor flags an availability clash (Cass available 08:00–19:00 Mon)
await page.getByRole("button", { name: "+ New shift" }).click();
await page.waitForTimeout(300);
await modal.locator("select").nth(0).selectOption({ label: "Cass Reid" });
await modal.locator("select").nth(1).selectOption({ label: "Monday" });
await modal.locator('input[type="time"]').nth(0).fill("20:00");
await modal.locator('input[type="time"]').nth(1).fill("21:00");
await page.waitForTimeout(200);
check("editor warns on availability clash", await modal.locator(".editor-warn").isVisible());
await modal.getByRole("button", { name: "Cancel" }).click();
await page.waitForTimeout(200);

// 9d. hours-balance panel flags under-contract staff
check("balance panel flags under-contract", await page.locator(".bal-chip.under").first().isVisible());

// 9e. platform admin: organisations panel + create a new workplace
check("organisations panel visible to platform admin", await page.getByText("Add a workplace").isVisible());
check("existing org listed in platform panel", await page.locator(".org-add").first().isVisible() && (await page.locator(".list-row strong", { hasText: "The Mood & Mind Centre" }).count()) > 0);
await page.getByPlaceholder("Workplace name").fill("Sunshine Clinic");
await page.getByPlaceholder("Badge (e.g. M&M)").fill("SUN");
await page.getByPlaceholder("First admin name").fill("Pat Lee");
await page.getByPlaceholder("Admin PIN").fill("2468");
await page.getByRole("button", { name: "Create", exact: true }).click();
await page.waitForTimeout(500);
check("new organisation created", state.orgs.length === 2 && state.orgs[1].name === "Sunshine Clinic");
check("new organisation shown in list", await page.getByText("Sunshine Clinic").first().isVisible());

// 9f. holiday approvals: approve a pending request with a comment
check("pending holiday shown to admin", await page.getByText("Family holiday").first().isVisible());
await page.locator(".timeoff-row.pending input").first().fill("Enjoy!");
await page.locator(".timeoff-row.pending").first().getByRole("button", { name: "Approve" }).click();
await page.waitForTimeout(400);
const uo1 = state.unavailability.find((u) => u.id === "uo1");
check("holiday approved with comment", uo1.status === "approved" && uo1.admin_note === "Enjoy!");

// 10. change own PIN from footer
await page.getByRole("button", { name: "Calendar" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "Change PIN", exact: true }).click();
await page.waitForTimeout(300);
await page.getByPlaceholder("New 4-digit PIN").fill("5678");
await page.getByPlaceholder("Repeat PIN").fill("5678");
await page.getByRole("button", { name: "Update PIN" }).click();
await page.waitForTimeout(400);
check("change PIN round-trips", state.changedPin === "5678");

// 11. away chip: Debbie has time off today; her shift should be flagged
state.unavailability.push({ id: "u9", staff_id: "s4", start_date: todayIso, end_date: todayIso, note: "sick", status: "approved" });
state.shifts.find((s) => s.id === "sh2").staff_id = "s4"; // restore Debbie on today's shift
await page.getByRole("button", { name: "Today" }).click();
await page.getByRole("button", { name: "Everyone" }).click();
await page.waitForTimeout(600);
check("away shift flagged as needing cover", await page.getByText("Away — needs cover").first().isVisible());

// 12. sign out returns to login
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForTimeout(400);
check("sign out returns to workplace entry", await page.getByText("Sign in to your workplace").isVisible());

check("no console/page errors", errors.length === 0);
console.log(results.join("\n"));
if (errors.length) console.log("ERRORS:", errors);
await browser.close();
await server.close();
