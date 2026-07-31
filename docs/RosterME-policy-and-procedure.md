# RosterME — Policy and Procedure

**The Mood & Mind Centre**

| | |
|---|---|
| Document | Staff Rostering System (RosterME) — Access, Administration and Use |
| Applies to | All staff of The Mood & Mind Centre |
| Version | 1.0 |
| Effective | 31 July 2026 |
| Owner | Director |
| First review | 31 October 2026 (3 months), then annually |

---

## 1. Purpose

To set out how the clinic's roster is created, changed, published and accessed
in RosterME, and who is permitted to do each of those things.

The roster determines who is at each site and when. Errors in it affect client
appointments, reception cover and staff pay. This document exists so that the
roster has one authoritative source, one clear line of authority for changing
it, and a record of every change.

## 2. Scope

Covers all rostering activity for The Mood & Mind Centre: fixed weekly shifts,
one-off and recurring shifts, leave, shift swaps, staff accounts and access.

**RosterME is the single source of truth for the roster.** From the effective
date, the Google Sheet is a planning aid only. Where the two disagree,
RosterME is correct.

## 3. Definitions

| Term | Meaning |
|---|---|
| **Weekly roster** | The repeating pattern of shifts. Changing it changes every future week. |
| **Shift** | A single dated occurrence generated from the weekly roster. |
| **Administrator** | A staff account with access to the Admin tab. |
| **Platform administrator** | KW Innovations — system-level support access. |
| **Time off** | A leave or unavailability request covering one or more whole days. |
| **Swap** | A shift a staff member offers to another, requiring administrator approval. |

## 4. Roles and responsibilities

| Who | Access | Responsible for |
|---|---|---|
| **Carla Lartigau** | Administrator | Building and adjusting the roster; approving leave and swaps; maintaining staff records |
| **Irene** | Administrator | As above — shared authority, so neither is a single point of failure |
| **All other staff** | Standard | Keeping their availability current; requesting leave in advance; checking their own roster |
| **Director** | Oversight | Approving this policy; authorising anything in section 7 |
| **KW Innovations** | Platform | Technical support, account recovery, system changes |

Carla and Irene hold equal authority. Either may act alone; neither needs the
other's sign-off for routine rostering.

## 5. Policy

### 5.1 Access

1. Every staff member gets their own named account. **Accounts are not shared.**
2. Access is by 4-digit PIN. PINs are personal and must not be disclosed to
   anyone, including administrators.
3. PINs are stored encrypted and **cannot be retrieved by anybody** — not by
   Carla, not by Irene, not by KW Innovations. A forgotten PIN is reset, not
   looked up.
4. A starting PIN is issued when an account is created. **The staff member must
   change it at first sign-in** (Account → Change my PIN).
5. When someone leaves, their account is marked **Inactive** the same day. It is
   not deleted — their past shifts stay on the record.

### 5.2 Roster authority

6. Only Carla and Irene may change the roster.
7. The roster is published at least **two weeks ahead** of the week worked.
8. Changes to a published week are communicated directly to the affected staff
   member. The app does not send notifications.
9. Every rostered week must satisfy the clinic's award obligations (section 6.3).

### 5.3 Leave and swaps

10. **All** time off requires administrator approval before it counts. This
    applies to administrators' own leave as well — Carla's and Irene's requests
    go into the same queue and must be approved by the other.
11. Time off is requested through RosterME, not by text or verbally.
12. Approved leave shows on the roster as "away" so the gap is visible.
13. A swap is only effective once an administrator has approved it. Staff must
    not treat an accepted offer as settled until it shows **Approved**.

### 5.4 Records and privacy

14. The roster shows staff names, sites and hours. It contains no client
    information, and no client information is to be entered into it.
15. Personal calendar subscription links (section 6.8) are **private
    credentials**. Anyone holding the link can see that person's roster. They
    must not be forwarded, posted or shared.

## 6. Procedure

### 6.1 Signing in

1. Go to **adminroster.vercel.app**.
2. Enter the workplace code **`mm`** (or `moodandmind`) and press **Continue**.
3. Choose your name from the list.
4. Enter your 4-digit PIN. It signs you in as soon as the fourth digit is typed.

You stay signed in for 30 days on that device.

### 6.2 Installing it on a phone

- **iPhone:** open the site in Safari → Share → **Add to Home Screen**.
- **Android:** open in Chrome → **Install on this phone** when prompted, or via
  the account menu.

It then behaves like a normal app, including offline access to the last screen
you loaded.

### 6.3 Building or adjusting the roster — **Carla and Irene only**

1. Open the **Admin** tab.
2. Under **Build roster**, set **Week ending** to the week you're working on.
   The day columns update to that week's dates.
3. Under **Weekly roster**, use **+ Add** on a day to add a shift. Complete:
   - **Staff member**
   - **Repeats** — `Once` for a single date, or `Weekly`, `Fortnightly`,
     `Monthly` for a pattern
   - **Day of week** and **Time**
   - **Location** (Hope Island / Upper Coomera) and **Role**
4. Press **Save**. To change an existing shift, click it and edit.
5. **Copy a day** duplicates one day's shifts onto another — use it for
   repetitive weeks rather than retyping.
6. Press **Build 8 weeks from here** to generate the dated shifts.

**Before saving any week, confirm it meets the award** (Health Professionals and
Support Services Award 2010):

| Requirement | Rule |
|---|---|
| Ordinary hours | Mon–Fri, 6:00am – 6:00pm |
| Minimum shift | 3 hours part-time / 2 hours casual |
| Meal break | Max 5 hours worked before a 30–50 min unpaid meal break |
| Rest break | 10 min paid per 4 hours worked |

The editor flags a shift that falls outside a staff member's stated
availability, and blocks two shifts starting at the same time for the same
person. **These are warnings, not approvals** — the award check above is yours.

Use **Weekly hours balance** to confirm nobody is over or under contract before
you publish.

### 6.4 Approving time off

1. **Admin** tab → **Time off**.
2. Each request shows the dates, the reason and who it's from.
3. Add a comment if useful, then press **Approve** or **Deny**.
4. Approved leave appears on the roster immediately.

If the request lands on a week already rostered, arrange cover before approving.

### 6.5 Approving a swap

1. **Offers** tab → **Awaiting approval**.
2. Check the person taking the shift is qualified for that role and site, and
   that it doesn't put them over their hours.
3. Press **Approve** (the shift reassigns immediately) or **Decline**.

### 6.6 Adding a staff member

1. **Admin** tab → **Staff** → **Add a staff member**.
2. Enter their **full name**, a **4-digit starting PIN**, and their **contract
   hours** per week.
3. Press **Add staff member**.
4. Give them the starting PIN in person or by a private message, and tell them
   to change it at first sign-in.

### 6.7 Resetting a forgotten PIN

A PIN cannot be looked up. Carla or Irene reset it from **Admin → Staff**,
issue the new one privately, and the staff member changes it at next sign-in.

### 6.8 Subscribing to your roster in Google or iPhone Calendar

1. **Availability** tab → **Calendar sync**.
2. Copy the feed link and follow the on-screen steps for Google or iPhone.

Shifts then appear in your normal calendar. **Note the refresh delay** — Google
can take up to 24 hours to pick up a change, so the app remains authoritative
for anything last-minute. If a link is ever exposed, use **Reset link** to
revoke it.

### 6.9 Requesting time off — all staff

1. **Availability** tab → **Time off**.
2. Enter the first and last day, and a reason if you wish.
3. Press **Request time off**.
4. It shows as **Pending** until an administrator reviews it. **Pending is not
   approved.** Do not make commitments until it reads Approved.

### 6.10 Keeping availability current

**Availability** tab → set the days and hours you can work → **Save**.
Update it whenever your circumstances change. Administrators roster against it,
so an out-of-date entry causes clashes.

## 7. Restricted actions

The following must not be performed without the Director's authorisation, as
they affect the whole clinic and are not reversible from within the app:

| Action | Effect |
|---|---|
| **Start fresh** | Deletes the entire weekly roster and all future unswapped shifts |
| **Build 8 weeks from here** on a published week | Rebuilds those weeks from the pattern; manual one-off adjustments in that range are lost (approved swaps are kept) |
| Granting administrator access | Gives full control of the roster and all staff records |
| Marking a staff member inactive | Removes their access immediately |

If one of these is performed in error, contact KW Innovations before making
further changes.

## 8. If something goes wrong

| Problem | Do this |
|---|---|
| Forgotten PIN | Ask Carla or Irene for a reset |
| "Too many attempts" | Wait 10 minutes — this is the lockout after 5 wrong PINs |
| Roster looks empty | Check the month shown at the top of the calendar |
| Shift missing or wrong | Tell Carla or Irene — do not work to a roster you believe is wrong without checking |
| Calendar not updating | Expected; can lag up to 24 hours. Check the app |
| App won't load or shows an error | Contact KW Innovations |

## 9. Related documents

- Health Professionals and Support Services Award 2010
- Roster 2026 (Google Sheet) — planning aid, superseded by RosterME for the
  published roster

## 10. Review

Reviewed 3 months after the effective date, then annually, or sooner if the
system or the clinic's rostering practice changes.

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 31 July 2026 | First issue | Director |
