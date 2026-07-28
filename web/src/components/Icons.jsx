import React from "react";

/**
 * One icon set, drawn on a single 24px grid with a consistent 1.8 stroke.
 *
 * These replace the emoji the UI used to lean on. Emoji are rendered by the
 * operating system, so a pin on an iPhone, an Android and a Windows desktop
 * were three different pictures at three different weights — and none of them
 * matched the app's line work. Vectors inherit currentColor and stay sharp at
 * any size.
 */
const S = ({ children, size = 16, fill = "none", ...rest }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill={fill}
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false" {...rest}
  >
    {children}
  </svg>
);

export const PinIcon = (p) => (
  <S {...p}><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></S>
);

// A paper plane, not a jetliner: the detailed version turned to mush at the
// 13px the chips actually use it at.
export const PlaneIcon = (p) => (
  <S {...p}><path d="M20.5 3.5 3.5 10.2l6.6 2.7 2.7 6.6 7.7-16Z" /><path d="M10.1 12.9 20.5 3.5" /></S>
);

export const SunIcon = (p) => (
  <S {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></S>
);

export const PalmIcon = (p) => (
  <S {...p}><path d="M12 21c0-6 .6-9 1.2-11" /><path d="M13 8c-2.4-1.6-5-1.3-6.6.6M13 8c2.8-.7 5 .6 5.8 2.8M13 8c-1-2.6.2-5 2.6-5.7M13 8c2-2 1.6-4.6-.4-6" /><path d="M5 21h14" /></S>
);

export const SwapIcon = (p) => (
  <S {...p}><path d="M7 9 3.5 12.5 7 16M17 8l3.5 3.5L17 15" /><path d="M3.5 12.5H14M20.5 11.5H10" /></S>
);

export const CalendarIcon = (p) => (
  <S {...p}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 3v4M16 3v4" /></S>
);

export const WarnIcon = (p) => (
  <S {...p}><path d="M12 4.5 2.8 20h18.4L12 4.5Z" /><path d="M12 10v4m0 3v.01" /></S>
);

export const AlertIcon = (p) => (
  <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5m0 3.5v.01" /></S>
);

export const CheckIcon = (p) => (
  <S {...p} strokeWidth="2.4"><path d="M4.5 12.5 9.5 17.5 19.5 6.5" /></S>
);

export const InfoIcon = (p) => (
  <S {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5m0-9V7.6" /></S>
);

export const ChevronLeft = (p) => (
  <S {...p} strokeWidth="2.2"><path d="M14.5 5 7.5 12l7 7" /></S>
);

export const ChevronRight = (p) => (
  <S {...p} strokeWidth="2.2"><path d="M9.5 5l7 7-7 7" /></S>
);

export const ArrowRight = (p) => (
  <S {...p}><path d="M4 12h15m0 0-5-5m5 5-5 5" /></S>
);

export const PlusIcon = (p) => (
  <S {...p} strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></S>
);

export const CloseIcon = (p) => (
  <S {...p} strokeWidth="2.2"><path d="M6 6l12 12M18 6 6 18" /></S>
);

export const BackspaceIcon = (p) => (
  <S {...p}><path d="M9 5h9a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 18 19H9l-6-7 6-7Z" /><path d="M12.5 9.5l4 5m0-5-4 5" /></S>
);

export const EditIcon = (p) => (
  <S {...p} strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></S>
);

export const PrintIcon = (p) => (
  <S {...p}><path d="M6.5 9V3.5h11V9" /><rect x="3" y="9" width="18" height="7.5" rx="2" /><path d="M6.5 14h11v6.5h-11z" /></S>
);
