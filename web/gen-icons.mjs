// Render the RosterME mark to the PNG sizes the install prompts need.
// Chromium rasterises the same SVG the app uses, so the icons never drift
// from the in-app logo. Re-run after changing the mark:
//
//   node gen-icons.mjs
//
// Needs playwright available locally (`npm i -D playwright`) — deliberately not
// a package.json dependency, so deploy builds never pull browser binaries.
// Point CHROME_PATH at a Chromium build if the default location differs.
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = process.argv[2] ?? new URL("./public/icons/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// the calendar, without its squircle — reused at different insets
const CALENDAR = `
  <rect x="21" y="11" width="5" height="11" rx="2.5" fill="#bdece0"/>
  <rect x="38" y="11" width="5" height="11" rx="2.5" fill="#bdece0"/>
  <rect x="14" y="16" width="36" height="33" rx="7" fill="#ffffff"/>
  <path d="M14 23c0-3.9 3.1-7 7-7h22c3.9 0 7 3.1 7 7v2.5H14V23z" fill="#0c7f68"/>
  <rect x="19.5" y="30" width="7" height="6" rx="1.8" fill="#d7e7e2"/>
  <rect x="37.5" y="30" width="7" height="6" rx="1.8" fill="#d7e7e2"/>
  <rect x="19.5" y="39.5" width="7" height="6" rx="1.8" fill="#d7e7e2"/>
  <rect x="37.5" y="39.5" width="7" height="6" rx="1.8" fill="#d7e7e2"/>
  <rect x="28.5" y="30" width="7" height="15.5" rx="2.4" fill="#ffd66b"/>
  <path d="M29.4 37.7l1.7 1.7 3.1-3.5" stroke="#0a5a49" stroke-width="1.9"
        stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

const GRADIENT = `
  <defs>
    <linearGradient id="b" x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
      <stop stop-color="#17a488"/><stop offset="1" stop-color="#0a5a49"/>
    </linearGradient>
  </defs>`;

// rounded-square icon, mark inset from the edge (home screens add their own mask)
const standard = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${GRADIENT}
  <rect x="0" y="0" width="64" height="64" rx="14" fill="url(#b)"/>
  <g transform="translate(32,32) scale(0.92) translate(-32,-30)">${CALENDAR}</g>
</svg>`;

// maskable: full-bleed background, content kept inside the 80% safe zone
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  ${GRADIENT}
  <rect x="0" y="0" width="64" height="64" fill="url(#b)"/>
  <g transform="translate(32,32) scale(0.72) translate(-32,-30)">${CALENDAR}</g>
</svg>`;

const JOBS = [
  ["icon-192.png", standard, 192],
  ["icon-512.png", standard, 512],
  ["icon-maskable-192.png", maskable, 192],
  ["icon-maskable-512.png", maskable, 512],
  ["apple-touch-icon.png", standard, 180],
];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
for (const [name, svg, size] of JOBS) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">
       <div style="width:${size}px;height:${size}px">${svg.replace("<svg", `<svg width="${size}" height="${size}"`)}</div>
     </body>`,
  );
  const buf = await page.screenshot({ omitBackground: true });
  writeFileSync(`${OUT}/${name}`, buf);
  console.log(`${name}  ${size}x${size}  ${buf.length} bytes`);
}
await browser.close();
