/* PostgREST embed contract check.
 *
 * Why this exists: `holiday_approvals` added unavailability.reviewed_by -> staff,
 * giving that table a second foreign key to staff. PostgREST refuses to guess
 * between two paths, so the existing `staff:staff(id, name)` embed stopped
 * resolving and every request touching unavailability returned 500. Time off
 * and the calendar were down in production while the UI test suite — which
 * mocks the API — passed 36/36.
 *
 * The failure is entirely predictable from two files the repo already owns:
 * the migrations declare the foreign keys, and the edge function declares the
 * embeds. This walks both and fails when an embed is ambiguous.
 *
 *   node supabase/check-embeds.mjs
 *
 * No network, no credentials, no database — so it can run on every commit.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = join(HERE, "migrations");
const API = join(HERE, "functions", "api", "index.ts");

/* ---------- 1. foreign-key graph, from the migrations ---------- */

function foreignKeys() {
  const fks = []; // { child, column, parent }
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS, file), "utf8")
      .replace(/--[^\n]*/g, ""); // strip line comments

    // create table <name> ( ... );
    for (const m of sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)\s*\(([\s\S]*?)\n\s*\);/gi)) {
      const child = m[1];
      for (const r of m[2].matchAll(/^\s*([a-z_][a-z0-9_]*)\s+[^,]*?\breferences\s+(?:[a-z_]+\.)?([a-z_][a-z0-9_]*)\s*\(/gim)) {
        fks.push({ child, column: r[1], parent: r[2] });
      }
    }

    // alter table <name> add column <col> <type> references <parent>(...)
    for (const m of sql.matchAll(/alter\s+table\s+(?:only\s+)?([a-z_][a-z0-9_]*)([\s\S]*?);/gi)) {
      const child = m[1];
      for (const r of m[2].matchAll(/add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)\s+[^,;]*?\breferences\s+(?:[a-z_]+\.)?([a-z_][a-z0-9_]*)\s*\(/gi)) {
        fks.push({ child, column: r[1], parent: r[2] });
      }
    }
  }
  return fks;
}

// how many distinct foreign keys join these two tables, in either direction
const linkCount = (fks, a, b) =>
  fks.filter((f) => (f.child === a && f.parent === b) || (f.child === b && f.parent === a)).length;

/* ---------- 2. embeds, from the edge function ---------- */

// `const NAME = \`...\`;` — the shared SELECT constants
function selectConstants(src) {
  const out = {};
  for (const m of src.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*=\s*`([\s\S]*?)`/g)) out[m[1]] = m[2];
  return out;
}

// .from("table") ... .select(<literal or CONST>)
function selectSites(src, consts) {
  const sites = [];
  for (const m of src.matchAll(/\.from\(\s*["'`]([a-z_][a-z0-9_]*)["'`]\s*\)/g)) {
    const table = m[1];
    const rest = src.slice(m.index, m.index + 400);
    const sel = rest.match(/\.select\(\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|`([\s\S]*?)`|([A-Z][A-Z0-9_]*))/);
    if (!sel) continue;
    const value = sel[4] ? consts[sel[4]] : (sel[1] ?? sel[2] ?? sel[3]);
    if (value == null) continue;
    const line = src.slice(0, m.index).split("\n").length;
    sites.push({ table, select: value, line, via: sel[4] ?? null });
  }
  return sites;
}

/* Pull `alias:target(...)`, `target(...)` and `alias:target!constraint(...)`
 * out of a select string, recursing into nested embeds so the parent table is
 * tracked correctly. */
function embeds(select, parent) {
  const found = [];
  let i = 0;
  while (i < select.length) {
    const ch = select[i];
    if (ch === "(") { // skip an unattached group
      i = skip(select, i); continue;
    }
    const m = /^([a-z_][a-z0-9_]*)\s*(?::\s*([a-z_][a-z0-9_]*))?\s*(!\s*[a-z_][a-z0-9_]*)?\s*\(/i.exec(select.slice(i));
    if (m) {
      const target = m[2] ?? m[1];
      const constraint = m[3] ? m[3].replace(/^!\s*/, "") : null;
      const open = i + m[0].length - 1;
      const close = skip(select, open);
      found.push({ parent, target, constraint });
      found.push(...embeds(select.slice(open + 1, close - 1), target));
      i = close;
      continue;
    }
    i++;
  }
  return found;
}

// index just past the ")" matching the "(" at `open`
function skip(s, open) {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "(") depth++;
    else if (s[i] === ")") { depth--; if (depth === 0) return i + 1; }
  }
  return s.length;
}

/* ---------- 3. check ---------- */

const fks = foreignKeys();
const src = readFileSync(API, "utf8");
const consts = selectConstants(src);
const sites = selectSites(src, consts);

const tables = new Set(fks.flatMap((f) => [f.child, f.parent]));
const problems = [];
let checked = 0;

for (const site of sites) {
  for (const e of embeds(site.select, site.table)) {
    // only tables we know about; `location:locations(name)` on an unknown table
    // is not something this check can reason about
    if (!tables.has(e.parent) || !tables.has(e.target)) continue;
    checked++;
    const n = linkCount(fks, e.parent, e.target);
    if (n === 0) {
      problems.push({
        site, e, why: `no foreign key joins ${e.parent} and ${e.target}`,
      });
    } else if (n > 1 && !e.constraint) {
      const names = fks
        .filter((f) => (f.child === e.parent && f.parent === e.target) || (f.child === e.target && f.parent === e.parent))
        .map((f) => `${f.child}.${f.column}`);
      problems.push({
        site, e,
        why: `${n} foreign keys join ${e.parent} and ${e.target} (${names.join(", ")}) — ` +
             `PostgREST cannot choose, so this query fails at runtime. ` +
             `Name the constraint, e.g. ${e.target}!${e.parent}_${names[0].split(".")[1]}_fkey(...)`,
      });
    }
  }
}

console.log(`foreign keys found: ${fks.length}`);
console.log(`select sites found: ${sites.length}`);
console.log(`embeds checked:     ${checked}`);

if (problems.length === 0) {
  console.log("\nPASS: every embed resolves to exactly one foreign key");
  process.exit(0);
}

console.log("");
for (const p of problems) {
  console.log(`FAIL ${API.split("/").slice(-4).join("/")}:${p.site.line}`);
  console.log(`  .from("${p.site.table}")${p.site.via ? ` .select(${p.site.via})` : ""}`);
  console.log(`  embed: ${p.e.parent} -> ${p.e.target}${p.e.constraint ? `!${p.e.constraint}` : ""}`);
  console.log(`  ${p.why}\n`);
}
console.log(`${problems.length} ambiguous or impossible embed(s)`);
process.exit(1);
