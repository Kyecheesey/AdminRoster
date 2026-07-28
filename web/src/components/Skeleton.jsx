import React from "react";

/**
 * Placeholder rows shaped like the content that's coming.
 *
 * This replaces the word "Loading…" everywhere it used to appear: a ghost of
 * the real layout tells you something is on its way *and* reserves the space,
 * so the page doesn't lurch when the data lands.
 */
export function SkeletonRows({ count = 3 }) {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <div className="sk-card" key={i} style={{ opacity: 1 - i * 0.18 }}>
          <span className="sk sk-dot" />
          <span className="sk-stack">
            <span className="sk sk-line" style={{ width: "58%" }} />
            <span className="sk sk-line" style={{ width: "34%" }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** Same idea, sized for the inside of an existing card. */
export function SkeletonLines({ count = 3 }) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ display: "grid", gap: 12, padding: "6px 0" }}>
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <span className="sk sk-line" key={i} style={{ width: `${88 - i * 19}%` }} />
      ))}
    </div>
  );
}

export default SkeletonRows;
