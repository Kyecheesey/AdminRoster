import React from "react";

// RosterME mark: an emerald squircle holding a calendar whose "today" column
// is highlighted gold with a tick — scheduling, done. Scales cleanly from a
// 16px favicon to a hero lockup.
export function LogoMark({ size = 40, idSuffix = "" }) {
  const g = `rmBg${idSuffix}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RosterME">
      <defs>
        <linearGradient id={g} x1="10" y1="6" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#17a488" />
          <stop offset="1" stopColor="#0a5a49" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="17" fill={`url(#${g})`} />
      <rect x="21" y="11" width="5" height="11" rx="2.5" fill="#bdece0" />
      <rect x="38" y="11" width="5" height="11" rx="2.5" fill="#bdece0" />
      <rect x="14" y="16" width="36" height="33" rx="7" fill="#ffffff" />
      <path d="M14 23c0-3.9 3.1-7 7-7h22c3.9 0 7 3.1 7 7v2.5H14V23z" fill="#0c7f68" />
      <rect x="19.5" y="30" width="7" height="6" rx="1.8" fill="#d7e7e2" />
      <rect x="37.5" y="30" width="7" height="6" rx="1.8" fill="#d7e7e2" />
      <rect x="19.5" y="39.5" width="7" height="6" rx="1.8" fill="#d7e7e2" />
      <rect x="37.5" y="39.5" width="7" height="6" rx="1.8" fill="#d7e7e2" />
      <rect x="28.5" y="30" width="7" height="15.5" rx="2.4" fill="#ffd66b" />
      <path d="M29.4 37.7l1.7 1.7 3.1-3.5" stroke="#0a5a49" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ className = "" }) {
  return <span className={`wordmark ${className}`.trim()}>Roster<span>ME</span></span>;
}

/* ==========================================================================
   The Mood & Mind Centre
   ========================================================================== */

const SERIF = "Georgia, 'Times New Roman', Times, serif";

// Two overlapping circles — mood and mind, meeting in the middle. The lens
// where they cross deepens on its own because both are semi-transparent, so
// the mark reads correctly on white, on the sage tile and in print.
// The two discs are drawn at a fixed ratio wherever they appear: centres 1.2
// radii apart, so the lens is unmistakable but the circles stay legible as two.
function Discs({ cx = 32, cy = 32, r = 15 }) {
  const d = r * 0.6;
  return (
    <>
      <circle cx={cx - d} cy={cy} r={r} fill="#7fae90" fillOpacity="0.88" />
      <circle cx={cx + d} cy={cy} r={r} fill="#3f6f52" fillOpacity="0.74" />
    </>
  );
}

export function MoodMindMark({ size = 44 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64" fill="none"
      xmlns="http://www.w3.org/2000/svg" role="img" aria-label="The Mood & Mind Centre"
    >
      <Discs cx={32} cy={32} r={14} />
    </svg>
  );
}

// Full stacked lockup: emblem, serif wordmark, rule-flanked "CENTRE".
function MoodMindLogo() {
  return (
    <svg
      viewBox="0 0 320 132" fill="none" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="The Mood & Mind Centre"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <Discs cx={160} cy={30} r={16} />
      <text x="160" y="90" textAnchor="middle" fontFamily={SERIF} fontSize="30" fill="#33413a">
        The Mood <tspan fill="#5f8f72" fontStyle="italic">&amp; Mind</tspan>
      </text>
      <line x1="66" y1="108" x2="104" y2="108" stroke="#c3d6c9" strokeWidth="1.2" />
      <line x1="212" y1="108" x2="250" y2="108" stroke="#c3d6c9" strokeWidth="1.2" />
      <text x="160" y="113" textAnchor="middle" fontFamily={SERIF} fontSize="12.5" letterSpacing="6.5" fill="#5f8f72">
        CENTRE
      </text>
    </svg>
  );
}

// Compact horizontal lockup for tight spaces like the mobile app bar.
function MoodMindCompact() {
  return (
    <svg
      viewBox="0 0 250 44" fill="none" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="The Mood & Mind Centre"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <Discs cx={17} cy={22} r={11} />
      <text x="41" y="23" fontFamily={SERIF} fontSize="19" fill="#33413a">
        The Mood <tspan fill="#5f8f72" fontStyle="italic">&amp; Mind</tspan>
      </text>
      <text x="42" y="38" fontFamily={SERIF} fontSize="9.5" letterSpacing="4.4" fill="#5f8f72">
        CENTRE
      </text>
    </svg>
  );
}

/* ==========================================================================
   Per-workplace branding, keyed by workplace code (slug).
   ========================================================================== */

const ORG_BRANDS = {
  mm: { full: MoodMindLogo, compact: MoodMindCompact, mark: MoodMindMark, theme: "mm" },
};

export function OrgLogo({ slug, variant = "full" }) {
  const Logo = ORG_BRANDS[slug]?.[variant];
  return Logo ? <Logo /> : null;
}

export function OrgMark({ slug, size = 32 }) {
  const Mark = ORG_BRANDS[slug]?.mark;
  return Mark ? <Mark size={size} /> : null;
}

export function hasOrgLogo(slug) {
  return Boolean(ORG_BRANDS[slug]);
}

// The palette key for a workplace, or null to keep RosterME's own colours.
export function orgTheme(slug) {
  return ORG_BRANDS[slug]?.theme ?? null;
}

export default LogoMark;
