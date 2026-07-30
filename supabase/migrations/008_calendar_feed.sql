-- 008_calendar_feed.sql
--
-- Subscribable calendar feeds.
--
-- Staff asked for their shifts to show up in Google Calendar and the iPhone
-- Calendar app rather than only in RosterME. Both subscribe to an iCalendar
-- URL that they fetch unauthenticated, on their own schedule, from Google's
-- or Apple's servers — so the URL itself has to carry the credential.
--
-- Hence a per-person random token: it is a bearer secret in a URL. Anyone
-- holding the link can read that person's roster, so /calendar-token/reset
-- issues a fresh one and instantly breaks every link handed out before.

alter table staff
  add column if not exists calendar_token uuid not null default gen_random_uuid();

-- The feed endpoint looks a person up by token alone. Unique both to keep
-- that lookup unambiguous and to make a collision impossible rather than
-- merely unlikely.
create unique index if not exists staff_calendar_token_key
  on staff (calendar_token);

-- Times in an .ics file are meaningless without a zone, and a shift written
-- as 08:00 is 08:00 where the clinic is, not in whatever zone the subscriber
-- happens to be reading from.
alter table organisations
  add column if not exists timezone text not null default 'Australia/Brisbane';
