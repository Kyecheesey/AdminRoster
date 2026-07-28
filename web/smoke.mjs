/* Smoke test against the REAL API.
 *
 * audit.mjs drives the UI against a mock backend, so it proves the screens
 * work but says nothing about whether the deployed function does. That gap is
 * exactly how the unavailability 500s reached production with a green suite.
 *
 * This signs in for real and asks every read endpoint for a 200. It needs
 * credentials, so it is not part of the default build — run it after deploying
 * the edge function, and in CI if you add secrets for it.
 *
 *   ROSTER_ORG=mm ROSTER_STAFF="Cass Reid" ROSTER_PIN=1234 node smoke.mjs
 *
 * Optional: ROSTER_API to point at a different deployment.
 */
const API = process.env.ROSTER_API
  ?? "https://qozhbbkylgwbhhlcjako.supabase.co/functions/v1/api";
const ORG = process.env.ROSTER_ORG;
const STAFF = process.env.ROSTER_STAFF;
const PIN = process.env.ROSTER_PIN;

if (!ORG || !STAFF || !PIN) {
  console.error("Set ROSTER_ORG, ROSTER_STAFF and ROSTER_PIN. See the header of this file.");
  process.exit(2);
}

const results = [];
let token = null;

const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const plus = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

async function call(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-session": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* non-JSON body is itself a finding */ }
  return { status: res.status, json, text };
}

function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${ok || !detail ? "" : ` — ${detail}`}`);
}

// A 500 here is the signature of the bug this file exists to catch: the
// endpoint is reachable and authorised, but the query itself blew up.
async function expect200(name, path) {
  const r = await call(path);
  check(name, r.status === 200, `HTTP ${r.status}${r.json?.detail ? ` — ${r.json.detail}` : ""}`);
  return r;
}

/* ---------- run ---------- */

const org = await call(`/resolve-org?q=${encodeURIComponent(ORG)}`);
check("workplace resolves", org.status === 200 && Boolean(org.json?.org), `HTTP ${org.status}`);
if (org.status !== 200) process.exit(1);

const boot = await call(`/bootstrap?org=${encodeURIComponent(org.json.org.slug)}`);
check("staff list loads", boot.status === 200 && Array.isArray(boot.json?.staff), `HTTP ${boot.status}`);

const me = (boot.json?.staff ?? []).find((s) => s.name === STAFF);
check("named staff member exists", Boolean(me), `no staff called "${STAFF}"`);
if (!me) process.exit(1);

const login = await call("/login", { method: "POST", body: { staffId: me.id, pin: PIN, org: org.json.org.slug } });
check("sign in", login.status === 200 && Boolean(login.json?.token), `HTTP ${login.status} ${login.json?.error ?? ""}`);
if (login.status !== 200) process.exit(1);
token = login.json.token;

// the two that were down, plus everything else a signed-in user loads
await expect200("GET /calendar", `/calendar?start=${plus(-7)}&end=${plus(21)}`);
await expect200("GET /unavailability", "/unavailability");
await expect200("GET /availability", "/availability");
await expect200("GET /offers", "/offers");
await expect200("GET /meta", "/meta");

if (login.json.staff?.isAdmin) {
  await expect200("GET /unavailability?all=1 (admin)", "/unavailability?all=1");
  await expect200("GET /availability?all=1 (admin)", "/availability?all=1");
  await expect200("GET /admin/template (admin)", "/admin/template");
}
if (login.json.staff?.isPlatformAdmin) {
  await expect200("GET /platform/orgs (platform admin)", "/platform/orgs");
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
