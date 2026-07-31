/* Render the rostering policy to PDF.
 *
 * Chromium rather than a PDF library: the document is mostly tables, and
 * getting column widths, page-break behaviour and typography right in
 * reportlab costs far more than writing the CSS. Uses the same headless
 * browser already installed for the UI tests.
 *
 *   cd web && node build-policy-pdf.mjs
 *
 * Lives in web/ because that is where playwright is installed; it writes to
 * ../docs/ beside the markdown it renders.
 */
import { chromium } from "playwright-core";
import { readFile, stat } from "node:fs/promises";

const OUT = process.argv[2] ?? new URL("../docs/RosterME-policy-and-procedure.pdf", import.meta.url).pathname;
const SRC = new URL("../docs/RosterME-policy-and-procedure.md", import.meta.url).pathname;
const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";

/* ---------- a small markdown subset: exactly what the policy uses ---------- */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// **bold**, `code`, and nothing else — the source is deliberately plain
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

function render(md) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;

  const isTableSep = (s) => /^\|[\s:|-]+\|$/.test(s.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    // horizontal rule
    if (/^---+$/.test(line.trim())) { out.push('<hr class="rule">'); i++; continue; }

    // table: header row, separator, then body until a non-pipe line
    if (line.trim().startsWith("|") && isTableSep(lines[i + 1] ?? "")) {
      const cells = (s) => s.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
      const head = cells(line);
      i += 2;
      const body = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) body.push(cells(lines[i++]));
      // a header row of all-empty cells is a layout table, not a labelled one
      const labelled = head.some((h) => h !== "");
      out.push(
        `<table class="${labelled ? "" : "plain"}">` +
          (labelled ? `<thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>` : "") +
          `<tbody>${body
            .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`,
      );
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const lvl = h[1].length;
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    // Lists. Ordered items are numbered policy clauses, so their numbers must
    // survive verbatim rather than being renumbered by the browser — clause 12
    // has to stay clause 12 however the document is later edited. Indented
    // bullets nest inside the item above them rather than joining the sequence.
    const LIST = /^(\s*)(\d+\.|[-*])\s+(.*)$/;
    if (LIST.test(line)) {
      const baseIndent = line.match(LIST)[1].length;
      const items = [];
      let ordered = false;

      while (i < lines.length && LIST.test(lines[i])) {
        const [, indent, marker, rest] = lines[i].match(LIST);
        if (indent.length > baseIndent) {
          // a nested bullet belongs to the item above it
          let text = rest;
          while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !LIST.test(lines[i + 1])) {
            text += " " + lines[++i].trim();
          }
          (items[items.length - 1].children ??= []).push(text);
          i++;
          continue;
        }
        if (/\d/.test(marker)) ordered = true;
        let text = rest;
        while (i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && !LIST.test(lines[i + 1])) {
          text += " " + lines[++i].trim();
        }
        items.push({ marker: marker.replace(".", ""), text });
        i++;
      }

      const kids = (it) =>
        it.children ? `<ul class="sub">${it.children.map((c) => `<li>${inline(c)}</li>`).join("")}</ul>` : "";

      out.push(
        ordered
          ? `<ol class="clauses">${items
              .map(
                (it) =>
                  `<li><span class="n">${it.marker}.</span>` +
                  `<span class="t">${inline(it.text)}${kids(it)}</span></li>`,
              )
              .join("")}</ol>`
          : `<ul>${items.map((it) => `<li>${inline(it.text)}${kids(it)}</li>`).join("")}</ul>`,
      );
      continue;
    }

    // paragraph — join until blank line
    let p = line.trim();
    while (i + 1 < lines.length && !/^\s*$/.test(lines[i + 1]) && !/^[#|-]/.test(lines[i + 1])) {
      p += " " + lines[++i].trim();
    }
    out.push(`<p>${inline(p)}</p>`);
    i++;
  }
  return out.join("\n");
}

/* ---------- page furniture ---------- */

const CSS = `
  @page { size: A4; margin: 20mm 16mm 18mm; }

  :root { --ink:#1b241f; --soft:#4a5a54; --muted:#6f7f78;
          --brand:#3f7d5e; --deep:#2b563f; --line:#d9e2dd; --wash:#f2f6f3; }

  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10pt; line-height: 1.5; color: var(--ink); margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }

  /* masthead, first page only */
  .masthead { border-bottom: 2.5pt solid var(--brand); padding-bottom: 10pt; margin-bottom: 16pt; }
  .masthead .org {
    font-size: 8.5pt; font-weight: 700; letter-spacing: 1.4pt;
    text-transform: uppercase; color: var(--brand); margin-bottom: 5pt;
  }
  .masthead h1 { font-size: 20pt; line-height: 1.2; margin: 0; color: var(--deep); letter-spacing: -0.3pt; }
  .masthead .sub { font-size: 10pt; color: var(--muted); margin-top: 4pt; }

  h2 {
    font-size: 12.5pt; color: var(--deep); margin: 20pt 0 7pt;
    padding-bottom: 3pt; border-bottom: 0.75pt solid var(--line);
    break-after: avoid; page-break-after: avoid;
  }
  h3 { font-size: 10.5pt; color: var(--deep); margin: 13pt 0 5pt; break-after: avoid; page-break-after: avoid; }
  p { margin: 0 0 7pt; }
  strong { color: var(--ink); font-weight: 700; }
  code {
    font-family: "SF Mono", Menlo, Consolas, monospace; font-size: 9pt;
    background: var(--wash); padding: 0.5pt 3pt; border-radius: 2pt; color: var(--deep);
  }
  hr.rule { display: none; }

  /* numbered policy clauses keep their source numbering */
  ol.clauses { list-style: none; margin: 0 0 8pt; padding: 0; }
  ol.clauses li { display: flex; gap: 7pt; margin-bottom: 5pt; break-inside: avoid; page-break-inside: avoid; }
  ol.clauses .n { flex: 0 0 16pt; font-weight: 700; color: var(--brand); }
  ol.clauses .t { flex: 1; }
  ul { margin: 0 0 8pt; padding-left: 14pt; }
  ul li { margin-bottom: 4pt; }
  /* the fields to fill in under a numbered step */
  ul.sub { margin: 4pt 0 0; padding-left: 13pt; }
  ul.sub li { margin-bottom: 2pt; color: var(--soft); }

  table {
    width: 100%; border-collapse: collapse; margin: 6pt 0 11pt; font-size: 9pt;
    break-inside: avoid; page-break-inside: avoid;
  }
  th {
    text-align: left; background: var(--brand); color: #fff; font-weight: 700;
    padding: 5pt 7pt; font-size: 8.5pt; letter-spacing: 0.2pt;
  }
  td { padding: 5pt 7pt; border-bottom: 0.5pt solid var(--line); vertical-align: top; }
  tbody tr:nth-child(even) td { background: #f8fbf9; }
  table.plain td:first-child { font-weight: 700; width: 27%; color: var(--soft); }
  table.plain th { display: none; }

  /* keep a heading with the block that follows it */
  h2 + p, h2 + table, h2 + ol, h3 + p, h3 + table, h3 + ol { break-before: avoid; page-break-before: avoid; }
`;

const md = await readFile(SRC, "utf8");

// The markdown title block becomes the masthead; the body starts at "## 1.".
// The document-control table is taken line by line — slicing to the first
// "---" instead lands inside the table's own |---|---| separator row.
const bodyMd = md.slice(md.indexOf("## 1."));

const allLines = md.split("\n");
const metaStart = allLines.findIndex((l) => l.trim().startsWith("| |"));
let metaEnd = metaStart;
while (metaEnd < allLines.length && allLines[metaEnd].trim().startsWith("|")) metaEnd++;
const metaMd = allLines.slice(metaStart, metaEnd).join("\n");
if (metaStart < 0 || metaEnd - metaStart < 3) throw new Error("document-control table not found");

const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
<div class="masthead">
  <div class="org">The Mood &amp; Mind Centre</div>
  <h1>Staff Rostering System (RosterME)</h1>
  <div class="sub">Access, Administration and Use &middot; Policy and Procedure</div>
</div>
${render(metaMd)}
${render(bodyMd)}`;

// keeping the intermediate HTML makes the layout reviewable without a PDF viewer
if (process.env.KEEP_HTML) await (await import("node:fs/promises")).writeFile(process.env.KEEP_HTML, html);

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "load" });
await page.pdf({
  path: OUT,
  format: "A4",
  printBackground: true,
  margin: { top: "20mm", bottom: "18mm", left: "16mm", right: "16mm" },
  displayHeaderFooter: true,
  headerTemplate: `<div style="width:100%;font-size:7pt;color:#9aa8a2;
    font-family:Helvetica,Arial,sans-serif;padding:0 16mm;">
    <span style="float:right">The Mood &amp; Mind Centre</span></div>`,
  footerTemplate: `<div style="width:100%;font-size:7pt;color:#9aa8a2;
    font-family:Helvetica,Arial,sans-serif;padding:0 16mm;
    border-top:0.5pt solid #d9e2dd;padding-top:4pt;">
    <span>RosterME — Policy and Procedure &middot; v1.0 &middot; Effective 31 July 2026</span>
    <span style="float:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`,
});
await browser.close();

const { size } = await stat(OUT);
console.log(`${OUT}  ${(size / 1024).toFixed(0)} kB`);
