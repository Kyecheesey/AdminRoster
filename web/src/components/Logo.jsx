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

export default LogoMark;
