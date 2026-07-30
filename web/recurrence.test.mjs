/* Recurrence rules, checked against hand-worked dates.
 *
 * occursOn() exists twice — here in the web app and in the edge function —
 * because the roster has to show the same answer the generator will produce.
 * Duplicated logic drifts, so this pins the behaviour down with concrete dates
 * rather than restating the implementation.
 *
 *   node recurrence.test.mjs
 *
 * Pure logic: no browser, no network, no database.
 */
import { occursOn } from "./src/util.js";

let failed = 0;
const check = (name, got, want) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${ok ? "" : ` (got ${got}, want ${want})`}`);
};

// 2026-08-03 is a Monday. Everything below is worked from that.
const MON = "2026-08-03";
const TUE = "2026-08-04";
const NEXT_MON = "2026-08-10";
const MON_3 = "2026-08-17";

const weekly = { frequency: "weekly", day_of_week: 0 };
check("weekly falls on its weekday", occursOn(weekly, MON), true);
check("weekly skips other days", occursOn(weekly, TUE), false);
check("weekly repeats the next week", occursOn(weekly, NEXT_MON), true);

const once = { frequency: "once", day_of_week: 5, start_date: "2026-08-15" };
check("one-off lands on its date", occursOn(once, "2026-08-15"), true);
check("one-off does not repeat", occursOn(once, "2026-08-22"), false);
check("one-off ignores other days", occursOn(once, MON), false);

const daily = { frequency: "daily", day_of_week: 0 };
check("daily covers a weekday", occursOn(daily, TUE), true);
check("daily covers a weekend", occursOn(daily, "2026-08-08"), true);

const fortnightly = { frequency: "fortnightly", day_of_week: 0, start_date: MON };
check("fortnightly starts on its anchor", occursOn(fortnightly, MON), true);
check("fortnightly skips the odd week", occursOn(fortnightly, NEXT_MON), false);
check("fortnightly returns two weeks on", occursOn(fortnightly, MON_3), true);
check("fortnightly ignores other weekdays", occursOn(fortnightly, TUE), false);

const monthlyDate = { frequency: "monthly_date", day_of_week: 5, start_date: "2026-08-15" };
check("monthly by date repeats on the same number", occursOn(monthlyDate, "2026-09-15"), true);
check("monthly by date skips neighbouring days", occursOn(monthlyDate, "2026-09-14"), false);

// the 31st has to survive a 28-day month rather than silently vanishing
const monthlyEnd = { frequency: "monthly_date", day_of_week: 5, start_date: "2026-01-31" };
check("monthly by date clamps to a short month", occursOn(monthlyEnd, "2026-02-28"), true);
check("monthly by date does not double up in Feb", occursOn(monthlyEnd, "2026-02-27"), false);
check("monthly by date still hits a long month", occursOn(monthlyEnd, "2026-03-31"), true);

// 2026-08-03 is the 1st Monday; 2026-09-07 is the 1st Monday of September
const monthlyWeekday = { frequency: "monthly_weekday", day_of_week: 0, start_date: MON };
check("monthly by weekday keeps its ordinal", occursOn(monthlyWeekday, "2026-09-07"), true);
check("monthly by weekday skips the 2nd Monday", occursOn(monthlyWeekday, "2026-09-14"), false);
check("monthly by weekday ignores other weekdays", occursOn(monthlyWeekday, "2026-09-08"), false);

const bounded = { frequency: "weekly", day_of_week: 0, end_date: "2026-08-05" };
check("end date stops the pattern", occursOn(bounded, NEXT_MON), false);
check("end date includes its own day", occursOn(bounded, MON), true);

const later = { frequency: "weekly", day_of_week: 0, start_date: NEXT_MON };
check("start date holds the pattern back", occursOn(later, MON), false);
check("start date lets it begin", occursOn(later, NEXT_MON), true);

// existing rows predate the feature and carry no frequency at all
check("a row with no frequency behaves weekly", occursOn({ day_of_week: 0 }, MON), true);
check("a row with no frequency skips other days", occursOn({ day_of_week: 0 }, TUE), false);

console.log(failed ? `\n${failed} failed` : "\nall recurrence rules hold");
process.exit(failed ? 1 : 0);
