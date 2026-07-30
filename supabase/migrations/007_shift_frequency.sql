-- Shift recurrence.
--
-- Until now every roster_template row meant "this day of the week, forever".
-- There was no way to add a single extra shift on one date: putting it in the
-- template made it repeat every week from then on.
--
-- A one-off is now just a template row with frequency = 'once', which keeps it
-- inside the normal generate/rebuild path — "Build 8 weeks" recreates it rather
-- than deleting it, which is what would happen if one-offs were loose
-- shift_instances.
--
-- Additive with a 'weekly' default, so every existing row keeps behaving
-- exactly as it does today.

alter table roster_template
  add column frequency text not null default 'weekly',
  -- anchor. Required for once / fortnightly / monthly_*; ignored for
  -- weekly and daily, which repeat with no reference point.
  add column start_date date,
  -- optional stop; null means "keeps going"
  add column end_date date;

alter table roster_template
  add constraint roster_template_frequency_check
  check (frequency in ('once', 'daily', 'weekly', 'fortnightly', 'monthly_date', 'monthly_weekday'));

-- The frequencies that are meaningless without a date to count from.
alter table roster_template
  add constraint roster_template_anchor_check
  check (
    frequency in ('weekly', 'daily')
    or start_date is not null
  );

alter table roster_template
  add constraint roster_template_range_check
  check (end_date is null or start_date is null or end_date >= start_date);

comment on column roster_template.frequency is
  'once | daily | weekly | fortnightly | monthly_date (same day number) | monthly_weekday (e.g. 3rd Tuesday)';
comment on column roster_template.start_date is
  'Anchor date. The date itself for ''once''; the pattern origin for fortnightly/monthly.';
comment on column roster_template.end_date is
  'Optional last date the shift can occur on. Null means indefinitely.';
