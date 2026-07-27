// RosterME API — single edge function with custom PIN auth, multi-organisation.
// All DB access happens here with the service-role key; the browser only ever
// holds a short signed session token, never a database credential. Every tenant
// row carries an org_id and all reads/writes are scoped to the caller's org.
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const SIGNING_SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SESSION_DAYS = 30;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-session",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

const enc = new TextEncoder();

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(SIGNING_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type Session = { sid: string; name: string; adm: boolean; padm: boolean; oid: string; org: string; exp: number };

async function makeToken(s: Session): Promise<string> {
  const payload = btoa(JSON.stringify(s)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${payload}.${await hmac(payload)}`;
}

async function readSession(req: Request): Promise<Session | null> {
  const token = req.headers.get("x-session");
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  if (await hmac(payload) !== sig) return null;
  try {
    const s = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Session;
    if (s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}

// naive per-instance login throttle: 5 bad PINs per staff per 10 minutes
const failures = new Map<string, { n: number; t: number }>();
function throttled(staffId: string): boolean {
  const f = failures.get(staffId);
  if (!f) return false;
  if (Date.now() - f.t > 10 * 60 * 1000) { failures.delete(staffId); return false; }
  return f.n >= 5;
}
function recordFailure(staffId: string) {
  const f = failures.get(staffId) ?? { n: 0, t: Date.now() };
  failures.set(staffId, { n: f.n + 1, t: Date.now() });
}

function toDow(dateStr: string): number {
  // 0=Monday .. 6=Sunday, matching roster_template.day_of_week
  return (new Date(dateStr + "T00:00:00Z").getUTCDay() + 6) % 7;
}

function* dateRange(start: string, end: string): Generator<string> {
  const d = new Date(start + "T00:00:00Z");
  const e = new Date(end + "T00:00:00Z");
  while (d <= e) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Resolve which organisation a pre-login request is for: explicit ?org=slug,
// else a custom ?host=domain match, else the earliest (primary) organisation.
async function resolveOrg(url: URL) {
  const cols = "id, slug, name, short_name, domain";
  const slug = url.searchParams.get("org");
  if (slug) {
    const { data } = await supabase.from("organisations").select(cols)
      .eq("active", true).eq("slug", slug).maybeSingle();
    return data;
  }
  const host = url.searchParams.get("host");
  if (host) {
    const { data } = await supabase.from("organisations").select(cols)
      .eq("active", true).eq("domain", host).maybeSingle();
    if (data) return data;
  }
  const { data } = await supabase.from("organisations").select(cols)
    .eq("active", true).order("created_at").limit(1).maybeSingle();
  return data;
}

// Materialise shift instances from a single org's fixed weekly template.
async function ensureInstances(orgId: string, start: string, end: string) {
  const [tplRes, existingRes] = await Promise.all([
    supabase.from("roster_template").select("*").eq("active", true).eq("org_id", orgId),
    supabase.from("shift_instances").select("template_id, shift_date").eq("org_id", orgId)
      .gte("shift_date", start).lte("shift_date", end).not("template_id", "is", null),
  ]);
  if (tplRes.error) throw tplRes.error;
  if (existingRes.error) throw existingRes.error;
  const have = new Set(existingRes.data!.map((r) => `${r.template_id}|${r.shift_date}`));
  const rows = [];
  for (const date of dateRange(start, end)) {
    const dow = toDow(date);
    for (const t of tplRes.data!) {
      if (t.day_of_week !== dow) continue;
      if (have.has(`${t.id}|${date}`)) continue;
      rows.push({
        org_id: orgId,
        template_id: t.id,
        staff_id: t.staff_id,
        shift_date: date,
        start_time: t.start_time,
        end_time: t.end_time,
        location_id: t.location_id,
        role_id: t.role_id,
      });
    }
  }
  if (rows.length) {
    const { error: insErr } = await supabase
      .from("shift_instances")
      .upsert(rows, { onConflict: "staff_id,shift_date,start_time", ignoreDuplicates: true });
    if (insErr) throw insErr;
  }
}

const SHIFT_SELECT = `*,
  location:locations(name),
  role:roles(name),
  staff:staff(id, name)`;

const OFFER_SELECT = `*,
  shift:shift_instances(*, location:locations(name), role:roles(name)),
  offerer:staff!swap_offers_offered_by_fkey(id, name),
  acceptor:staff!swap_offers_accepted_by_fkey(id, name)`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  // path after the function name, e.g. /api/login -> /login
  const path = url.pathname.replace(/^\/api/, "") || "/";
  const body = (req.method === "POST" || req.method === "PUT") ? await req.json().catch(() => ({})) : {};

  try {
    // ---------- public ----------
    // Resolve a single workplace by its custom domain or its code (slug).
    // There is deliberately no public directory: you reach a workplace only by
    // knowing its domain/code, so organisations stay private from each other.
    if (path === "/resolve-org" && req.method === "GET") {
      const raw = (url.searchParams.get("q") || "").trim().toLowerCase();
      const q = raw.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!q || !/^[a-z0-9][a-z0-9.\-]{0,80}$/.test(q)) {
        return json({ error: "Enter your workplace domain or code" }, 400);
      }
      const cols = "id, slug, name, short_name, domain";
      let { data } = await supabase.from("organisations").select(cols)
        .eq("active", true).eq("domain", q).maybeSingle();
      if (!data) {
        const r = await supabase.from("organisations").select(cols)
          .eq("active", true).eq("slug", q).maybeSingle();
        data = r.data;
      }
      if (!data) return json({ error: "No workplace found for that address" }, 404);
      return json({ org: data });
    }

    if (path === "/bootstrap" && req.method === "GET") {
      const org = await resolveOrg(url);
      if (!org) return json({ error: "Unknown workplace" }, 404);
      const { data, error } = await supabase
        .from("staff").select("id, name").eq("active", true).eq("org_id", org.id).order("name");
      if (error) throw error;
      return json({ org, staff: data });
    }

    if (path === "/login" && req.method === "POST") {
      const { staffId, pin } = body;
      if (!staffId || !pin) return json({ error: "Missing staffId or pin" }, 400);
      if (throttled(staffId)) return json({ error: "Too many attempts. Try again in 10 minutes." }, 429);
      const { data: staff, error } = await supabase
        .from("staff").select("*, org:organisations(id, slug, name, short_name)")
        .eq("id", staffId).eq("active", true).single();
      if (error || !staff?.pin_hash) return json({ error: "Invalid login" }, 401);
      const [salt, hash] = staff.pin_hash.split("$");
      if (await sha256Hex(`${salt}:${pin}`) !== hash) {
        recordFailure(staffId);
        return json({ error: "Wrong PIN" }, 401);
      }
      failures.delete(staffId);
      const session: Session = {
        sid: staff.id, name: staff.name, adm: staff.is_admin, padm: staff.is_platform_admin,
        oid: staff.org_id, org: staff.org.slug,
        exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400,
      };
      return json({
        token: await makeToken(session),
        staff: { id: staff.id, name: staff.name, isAdmin: staff.is_admin, isPlatformAdmin: staff.is_platform_admin },
        org: staff.org,
      });
    }

    // ---------- authenticated ----------
    const me = await readSession(req);
    if (!me) return json({ error: "Not signed in" }, 401);

    if (path === "/me" && req.method === "GET") {
      return json({ staff: { id: me.sid, name: me.name, isAdmin: me.adm, isPlatformAdmin: me.padm } });
    }

    if (path === "/change-pin" && req.method === "POST") {
      const { pin } = body;
      // exactly 4 digits: the login keypad auto-submits after the 4th digit
      if (!/^\d{4}$/.test(pin ?? "")) return json({ error: "PIN must be exactly 4 digits" }, 400);
      const salt = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
      const pin_hash = `${salt}$${await sha256Hex(`${salt}:${pin}`)}`;
      const { error } = await supabase.from("staff").update({ pin_hash }).eq("id", me.sid);
      if (error) throw error;
      return json({ ok: true });
    }

    if (path === "/meta" && req.method === "GET") {
      const [locs, roles, staff] = await Promise.all([
        supabase.from("locations").select("*").eq("org_id", me.oid).order("name"),
        supabase.from("roles").select("*").eq("org_id", me.oid).order("name"),
        supabase.from("staff").select("id, name, contract_hours, is_admin, active").eq("org_id", me.oid).order("name"),
      ]);
      if (locs.error || roles.error || staff.error) throw locs.error ?? roles.error ?? staff.error;
      return json({ locations: locs.data, roles: roles.data, staff: staff.data });
    }

    if (path === "/calendar" && req.method === "GET") {
      const start = url.searchParams.get("start")!;
      const end = url.searchParams.get("end")!;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        return json({ error: "start/end must be YYYY-MM-DD" }, 400);
      }
      const span = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
      if (span < 0 || span > 70) return json({ error: "Range too large" }, 400);
      await ensureInstances(me.oid, start, end);
      const [shifts, unavail] = await Promise.all([
        supabase.from("shift_instances").select(SHIFT_SELECT).eq("org_id", me.oid)
          .gte("shift_date", start).lte("shift_date", end)
          .neq("status", "cancelled")
          .order("shift_date").order("start_time"),
        supabase.from("unavailability").select("*, staff:staff(id, name)").eq("org_id", me.oid)
          .lte("start_date", end).gte("end_date", start),
      ]);
      if (shifts.error || unavail.error) throw shifts.error ?? unavail.error;
      return json({ shifts: shifts.data, unavailability: unavail.data });
    }

    // ---------- availability ----------
    if (path === "/availability" && req.method === "GET") {
      const target = me.adm && url.searchParams.get("staffId")
        ? url.searchParams.get("staffId")! : me.sid;
      const all = me.adm && url.searchParams.get("all") === "1";
      let q = supabase.from("availability").select("*, staff:staff(id, name)")
        .eq("org_id", me.oid).order("day_of_week");
      if (!all) q = q.eq("staff_id", target);
      const { data, error } = await q;
      if (error) throw error;
      return json({ availability: data });
    }

    if (path === "/availability" && req.method === "POST") {
      const target = me.adm && body.staffId ? body.staffId : me.sid;
      const days = (body.days ?? []) as Array<{
        day_of_week: number; is_available: boolean;
        available_from: string | null; available_to: string | null; note: string | null;
      }>;
      const rows = days.map((d) => ({ ...d, staff_id: target, org_id: me.oid, updated_at: new Date().toISOString() }));
      const { error } = await supabase
        .from("availability").upsert(rows, { onConflict: "staff_id,day_of_week" });
      if (error) throw error;
      return json({ ok: true });
    }

    if (path === "/unavailability" && req.method === "GET") {
      const all = me.adm && url.searchParams.get("all") === "1";
      let q = supabase.from("unavailability")
        .select("*, staff:staff(id, name)").eq("org_id", me.oid).order("start_date", { ascending: false });
      if (!all) q = q.eq("staff_id", me.sid);
      const { data, error } = await q;
      if (error) throw error;
      return json({ unavailability: data });
    }

    if (path === "/unavailability" && req.method === "POST") {
      const target = me.adm && body.staffId ? body.staffId : me.sid;
      const { start_date, end_date, note } = body;
      const { error } = await supabase
        .from("unavailability").insert({ staff_id: target, org_id: me.oid, start_date, end_date, note });
      if (error) throw error;
      return json({ ok: true });
    }

    if (path === "/unavailability" && req.method === "DELETE") {
      const id = url.searchParams.get("id")!;
      let q = supabase.from("unavailability").delete().eq("id", id).eq("org_id", me.oid);
      if (!me.adm) q = q.eq("staff_id", me.sid);
      const { error } = await q;
      if (error) throw error;
      return json({ ok: true });
    }

    // ---------- swap offers ----------
    if (path === "/offers" && req.method === "GET") {
      const { data, error } = await supabase.from("swap_offers")
        .select(OFFER_SELECT).eq("org_id", me.oid).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ offers: data });
    }

    if (path === "/offers" && req.method === "POST") {
      const { shiftInstanceId, note } = body;
      const { data: shift, error: sErr } = await supabase
        .from("shift_instances").select("*").eq("id", shiftInstanceId).eq("org_id", me.oid).single();
      if (sErr || !shift) return json({ error: "Shift not found" }, 404);
      if (shift.staff_id !== me.sid && !me.adm) {
        return json({ error: "You can only offer your own shifts" }, 403);
      }
      if (shift.shift_date < new Date().toISOString().slice(0, 10)) {
        return json({ error: "Cannot offer a past shift" }, 400);
      }
      const { data: existing } = await supabase.from("swap_offers")
        .select("id").eq("shift_instance_id", shiftInstanceId)
        .in("status", ["open", "pending_approval"]);
      if (existing?.length) return json({ error: "This shift already has an active offer" }, 409);
      const { error } = await supabase.from("swap_offers").insert({
        shift_instance_id: shiftInstanceId, offered_by: shift.staff_id, org_id: me.oid, offer_note: note ?? null,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    const offerAction = path.match(/^\/offers\/([0-9a-f-]+)\/(accept|cancel|approve|reject)$/);
    if (offerAction && req.method === "POST") {
      const [, id, action] = offerAction;
      const { data: offer, error: oErr } = await supabase
        .from("swap_offers").select("*").eq("id", id).eq("org_id", me.oid).single();
      if (oErr || !offer) return json({ error: "Offer not found" }, 404);
      const now = new Date().toISOString();

      if (action === "accept") {
        if (offer.status !== "open") return json({ error: "Offer is not open" }, 409);
        if (offer.offered_by === me.sid) return json({ error: "You cannot accept your own offer" }, 400);
        const { error } = await supabase.from("swap_offers")
          .update({ accepted_by: me.sid, status: "pending_approval", updated_at: now })
          .eq("id", id).eq("status", "open");
        if (error) throw error;
        return json({ ok: true });
      }

      if (action === "cancel") {
        if (offer.offered_by !== me.sid && !me.adm) return json({ error: "Not your offer" }, 403);
        if (!["open", "pending_approval"].includes(offer.status)) {
          return json({ error: "Offer already resolved" }, 409);
        }
        const { error } = await supabase.from("swap_offers")
          .update({ status: "cancelled", updated_at: now }).eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      if (!me.adm) return json({ error: "Admin only" }, 403);

      if (action === "approve") {
        if (offer.status !== "pending_approval" || !offer.accepted_by) {
          return json({ error: "Offer has no accepted taker yet" }, 409);
        }
        const { error: shiftErr } = await supabase.from("shift_instances")
          .update({ staff_id: offer.accepted_by, status: "swapped" })
          .eq("id", offer.shift_instance_id);
        if (shiftErr) {
          if (String(shiftErr.code) === "23505") {
            return json({ error: "The taker already has a shift starting at the same time that day." }, 409);
          }
          throw shiftErr;
        }
        const { error } = await supabase.from("swap_offers")
          .update({ status: "approved", admin_note: body.note ?? null, updated_at: now })
          .eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }

      if (action === "reject") {
        const { error } = await supabase.from("swap_offers")
          .update({ status: "rejected", admin_note: body.note ?? null, updated_at: now })
          .eq("id", id);
        if (error) throw error;
        return json({ ok: true });
      }
    }

    // ---------- platform admin: manage organisations ----------
    if (path === "/platform/orgs" && req.method === "GET") {
      if (!me.padm) return json({ error: "Platform admin only" }, 403);
      const { data: orgs, error } = await supabase.from("organisations")
        .select("id, slug, name, short_name, domain, active, created_at").order("created_at");
      if (error) throw error;
      const { data: counts } = await supabase.from("staff").select("org_id");
      const byOrg: Record<string, number> = {};
      for (const r of counts ?? []) byOrg[r.org_id] = (byOrg[r.org_id] ?? 0) + 1;
      return json({ organisations: (orgs ?? []).map((o) => ({ ...o, staff_count: byOrg[o.id] ?? 0 })) });
    }

    if (path === "/platform/orgs" && req.method === "POST") {
      if (!me.padm) return json({ error: "Platform admin only" }, 403);
      const { name, short_name, domain, adminName, adminPin } = body;
      if (!name || !adminName) return json({ error: "Organisation name and first admin name are required" }, 400);
      if (!/^\d{4}$/.test(adminPin ?? "")) return json({ error: "Admin PIN must be exactly 4 digits" }, 400);
      let slug = slugify(body.slug || name);
      if (!slug) return json({ error: "Could not derive a workplace code from the name" }, 400);
      // ensure the slug is unique
      const { data: clash } = await supabase.from("organisations").select("id").eq("slug", slug).maybeSingle();
      if (clash) slug = `${slug}-${crypto.randomUUID().slice(0, 4)}`;

      const { data: org, error: orgErr } = await supabase.from("organisations")
        .insert({ slug, name, short_name: short_name || null, domain: domain || null })
        .select("id, slug, name, short_name").single();
      if (orgErr) {
        if (String(orgErr.code) === "23505") return json({ error: "That domain is already used by another workplace" }, 409);
        throw orgErr;
      }
      // seed a starter location + role so the new org can roster immediately
      await supabase.from("locations").insert({ org_id: org.id, name: "Main" });
      await supabase.from("roles").insert({ org_id: org.id, name: "Staff" });
      // first admin for the new org
      const salt = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
      const pin_hash = `${salt}$${await sha256Hex(`${salt}:${adminPin}`)}`;
      const { error: staffErr } = await supabase.from("staff")
        .insert({ org_id: org.id, name: adminName, contract_hours: 0, is_admin: true, active: true, pin_hash });
      if (staffErr) throw staffErr;
      return json({ ok: true, org });
    }

    // ---------- org admin ----------
    if (path.startsWith("/admin/")) {
      if (!me.adm) return json({ error: "Admin only" }, 403);

      if (path === "/admin/template" && req.method === "GET") {
        const { data, error } = await supabase.from("roster_template")
          .select("*, location:locations(name), role:roles(name), staff:staff(id, name)")
          .eq("active", true).eq("org_id", me.oid)
          .order("day_of_week").order("start_time");
        if (error) throw error;
        return json({ template: data });
      }

      if (path === "/admin/template" && req.method === "POST") {
        const { staff_id, day_of_week, start_time, end_time, location_id, role_id } = body;
        if (!staff_id || !location_id || !role_id) return json({ error: "Staff, location and role are required" }, 400);
        if (end_time <= start_time) return json({ error: "End time must be after start time" }, 400);
        const { error } = await supabase.from("roster_template")
          .insert({ staff_id, day_of_week, start_time, end_time, location_id, role_id, org_id: me.oid });
        if (error) throw error;
        return json({ ok: true });
      }

      if (path === "/admin/template" && req.method === "PUT") {
        const { id, staff_id, day_of_week, start_time, end_time, location_id, role_id } = body;
        if (!id) return json({ error: "Missing shift id" }, 400);
        if (!staff_id || !location_id || !role_id) return json({ error: "Staff, location and role are required" }, 400);
        if (end_time <= start_time) return json({ error: "End time must be after start time" }, 400);
        const { error } = await supabase.from("roster_template")
          .update({ staff_id, day_of_week, start_time, end_time, location_id, role_id })
          .eq("id", id).eq("org_id", me.oid);
        if (error) throw error;
        return json({ ok: true });
      }

      if (path === "/admin/template" && req.method === "DELETE") {
        const id = url.searchParams.get("id")!;
        const { error } = await supabase.from("roster_template").delete().eq("id", id).eq("org_id", me.oid);
        if (error) throw error;
        return json({ ok: true });
      }

      if (path === "/admin/regenerate" && req.method === "POST") {
        const { start, end } = body;
        const { error } = await supabase.from("shift_instances").delete().eq("org_id", me.oid)
          .gte("shift_date", start).lte("shift_date", end).eq("status", "scheduled");
        if (error) throw error;
        await ensureInstances(me.oid, start, end);
        return json({ ok: true });
      }

      if (path === "/admin/staff" && req.method === "POST") {
        const { id, name, contract_hours, is_admin, active, pin } = body;
        const patch: Record<string, unknown> = {};
        if (name !== undefined) patch.name = name;
        if (contract_hours !== undefined) patch.contract_hours = contract_hours;
        if (is_admin !== undefined) patch.is_admin = is_admin;
        if (active !== undefined) patch.active = active;
        if (pin !== undefined) {
          // exactly 4 digits: the login keypad auto-submits after the 4th digit
          if (!/^\d{4}$/.test(pin)) return json({ error: "PIN must be exactly 4 digits" }, 400);
          const salt = crypto.randomUUID().replaceAll("-", "").slice(0, 16);
          patch.pin_hash = `${salt}$${await sha256Hex(`${salt}:${pin}`)}`;
        }
        if (id) {
          const { error } = await supabase.from("staff").update(patch).eq("id", id).eq("org_id", me.oid);
          if (error) throw error;
        } else {
          if (!patch.name || !patch.pin_hash) return json({ error: "New staff need a name and PIN" }, 400);
          patch.org_id = me.oid;
          const { error } = await supabase.from("staff").insert(patch);
          if (error) throw error;
        }
        return json({ ok: true });
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Server error", detail: String(e?.message ?? e) }, 500);
  }
});
