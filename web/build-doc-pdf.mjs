/* Render the clinic's RosterME documents to PDF.
 *
 * Chromium rather than a PDF library: these are mostly tables and screenshots,
 * and getting column widths, image scaling and page-break behaviour right in
 * reportlab costs far more than writing the CSS. Uses the same headless
 * browser already installed for the UI tests.
 *
 *   cd web && node build-doc-pdf.mjs [policy|guide|all]
 *
 * Markdown stays the source of truth; the PDFs are regenerated from it, so the
 * two cannot drift. Lives in web/ because that is where playwright is
 * installed; it writes to ../docs/ beside the markdown it renders.
 */
import { chromium } from "playwright-core";
import { readFile, readdir, stat } from "node:fs/promises";
import { basename, extname } from "node:path";

const CHROME = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium";
const docs = (f) => new URL(`../docs/${f}`, import.meta.url).pathname;

const DOCS = {
  policy: {
    src: docs("RosterME-policy-and-procedure.md"),
    out: docs("RosterME-policy-and-procedure.pdf"),
    title: "Staff Rostering System (RosterME)",
    sub: "Access, Administration and Use &middot; Policy and Procedure",
    bodyFrom: "## 1.",
    footer: "RosterME — Policy and Procedure &middot; v1.0 &middot; Effective 31 July 2026",
  },
  guide: {
    src: docs("RosterME-how-to-guide.md"),
    out: docs("RosterME-how-to-guide.pdf"),
    title: "RosterME — How to use it",
    sub: "User guide &middot; Part A for all staff, Part B for administrators",
    bodyFrom: "> Part A",
    figures: docs("guide-figures"),
    footer: "RosterME — How to use it &middot; v1.0 &middot; The Mood &amp; Mind Centre",
  },
};

/* ---------- a small markdown subset: exactly what the policy uses ---------- */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// **bold**, *italic*, `code`, and nothing else — the source is deliberately
// plain. Bold runs first, so the asterisks left for italics are unambiguous.
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>");

function render(md, figs = {}) {
  const lines = md.split("\n");
  const out = [];
  let i = 0;

  const isTableSep = (s) => /^\|[\s:|-]+\|$/.test(s.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    // horizontal rule
    if (/^---+$/.test(line.trim())) { out.push('<hr class="rule">'); i++; continue; }

    // figure: !fig[name|w=54]  — width is a percentage of the text column
    const fig = line.match(/^!fig\[([\w-]+)(?:\|w=(\d+))?\]\s*$/);
    if (fig) {
      const [, name, w] = fig;
      if (!figs[name]) throw new Error(`figure "${name}" not found — run guide-shots.mjs`);
      out.push(
        `<figure class="shot" style="width:${w ?? 100}%">` +
          `<img src="${figs[name]}" alt="">` +
        `</figure>`,
      );
      i++;
      continue;
    }

    // callout: a > blockquote, used for the things people get wrong
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<div class="callout">${render(buf.join("\n"), figs)}</div>`);
      continue;
    }

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
      // a top-level heading is a Part, and Parts start on a fresh page so the
      // staff half can be handed out without the administrator half attached
      out.push(lvl === 1 ? `<h1 class="part">${inline(h[2])}</h1>` : `<h${lvl}>${inline(h[2])}</h${lvl}>`);
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
    while (i + 1 < lines.length && !/^\s*$/.test(lines[i + 1]) && !/^[#|>-]/.test(lines[i + 1]) && !/^!fig\[/.test(lines[i + 1])) {
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

  /* Parts start their own page, so Part A can be handed out on its own */
  h1.part {
    break-before: page; page-break-before: always;
    font-size: 17pt; color: #fff; background: var(--brand);
    margin: 0 0 14pt; padding: 9pt 12pt; border-radius: 3pt;
    letter-spacing: -0.2pt;
  }
  h1.part:first-of-type { break-before: avoid; page-break-before: avoid; }

  /* screenshots — bordered so a white app screen reads as a figure and not
     as a hole in the page */
  figure.shot {
    margin: 9pt 0 12pt; padding: 0;
    break-inside: avoid; page-break-inside: avoid;
  }
  figure.shot img {
    display: block; width: 100%; height: auto;
    /* never taller than the printable area, or it is silently clipped */
    max-height: 225mm; object-fit: contain;
    border: 0.75pt solid var(--line); border-radius: 4pt;
    box-shadow: 0 1pt 4pt rgba(27,36,31,0.10);
  }

  .callout {
    background: var(--wash); border-left: 2.5pt solid var(--brand);
    padding: 8pt 11pt; margin: 8pt 0 11pt; border-radius: 0 3pt 3pt 0;
    break-inside: avoid; page-break-inside: avoid;
  }
  .callout p:last-child { margin-bottom: 0; }
  .callout p { font-size: 9.5pt; }
`;

/* ---------- build ---------- */

async function loadFigures(dir) {
  if (!dir) return {};
  const figs = {};
  for (const f of await readdir(dir)) {
    if (extname(f) !== ".png") continue;
    const b64 = (await readFile(`${dir}/${f}`)).toString("base64");
    figs[basename(f, ".png")] = `data:image/png;base64,${b64}`;
  }
  return figs;
}

async function build(key, browser) {
  const d = DOCS[key];
  const md = await readFile(d.src, "utf8");
  const figs = await loadFigures(d.figures);

  const body = md.slice(md.indexOf(d.bodyFrom));

  // The document-control table is taken line by line — slicing to the first
  // "---" instead lands inside the table's own |---|---| separator row.
  const all = md.split("\n");
  const from = all.findIndex((l) => l.trim().startsWith("| |"));
  let to = from;
  while (to < all.length && all[to].trim().startsWith("|")) to++;
  if (from < 0 || to - from < 3) throw new Error(`${key}: document-control table not found`);
  const meta = all.slice(from, to).join("\n");

  const html = `<!doctype html><meta charset="utf-8"><style>${CSS}</style>
<div class="masthead">
  <div class="org">The Mood &amp; Mind Centre</div>
  <h1>${d.title}</h1>
  <div class="sub">${d.sub}</div>
</div>
${render(meta, figs)}
${render(body, figs)}`;

  if (process.env.KEEP_HTML) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(`${process.env.KEEP_HTML}/${key}.html`, html);
  }

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });
  await page.pdf({
    path: d.out,
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
      <span>${d.footer}</span>
      <span style="float:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>`,
  });
  await page.close();
  const { size } = await stat(d.out);
  console.log(`${d.out}  ${(size / 1024).toFixed(0)} kB`);
}

const which = process.argv[2] ?? "all";
const keys = which === "all" ? Object.keys(DOCS) : [which];
for (const k of keys) if (!DOCS[k]) throw new Error(`unknown document "${k}" — try: ${Object.keys(DOCS).join(", ")} or all`);

const browser = await chromium.launch({ executablePath: CHROME });
for (const k of keys) await build(k, browser);
await browser.close();
