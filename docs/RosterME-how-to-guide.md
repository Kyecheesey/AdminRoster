# RosterME — How to use it

**The Mood & Mind Centre**

| | |
|---|---|
| Document | RosterME User Guide |
| Applies to | Part A: all staff. Part B: administrators only |
| Version | 1.0 |
| Effective | 31 July 2026 |
| Companion to | RosterME Policy and Procedure v1.0 |

> Part A is everything you need as a member of staff. Part B is for Carla and
> Irene, who build the roster. If you are not an administrator you will not see
> the Admin tab, and nothing in Part B applies to you.

---

# Part A — For everyone

## A1. Signing in

Go to **adminroster.vercel.app** on your phone or computer.

!fig[login-workplace|w=40]
Enter the workplace code **mm** and press **Continue**. You only do this the
first time on a device.

Then choose your name from the list, and enter your 4-digit PIN. It signs you
in the moment you type the fourth digit — there is no separate "go" button.

!fig[login-pin|w=40]

You stay signed in for 30 days on that device, so you will rarely do this more
than once.

**If you get it wrong five times** the app locks you out for 10 minutes. Wait
it out — it will start working again on its own.

**If you have forgotten your PIN**, ask Carla or Irene to reset it. Nobody can
look your PIN up, so a reset is the only way back in.

## A2. Put it on your phone's home screen

Worth doing. It then opens like any other app, full screen, without hunting
for a browser tab.

- **iPhone** — open the site in Safari, tap **Share**, then **Add to Home
  Screen**.
- **Android** — open it in Chrome and tap **Install** when it offers, or find
  **Install on this phone** in the account menu.

## A3. Reading your dashboard

This is the first screen after you sign in, and it is built to answer one
question fast: *am I working, and when?*

!fig[dashboard-phone|w=40]

**Up next** is the important part. It shows your next shift, how long until it
starts, and where. If you are working right now it turns green and counts down
to the end of your shift instead.

Below that, **Shifts this week** and **Hours this week** cover the Monday to
Sunday week containing whichever day you have selected.

Tap any date in the calendar to see that day. A green dot under a date means
you are working; a grey dot means somebody else is.

**My shifts / Team roster** switches between just your shifts and everyone's,
so you can see who else is on.

On a computer the same information spreads across two columns:

!fig[dashboard-desktop|w=100]

## A4. Telling us when you can work

Keep this current. Carla and Irene build the roster against it, so if it is out
of date you will get rostered at times that do not suit you.

Go to **Availability**.

!fig[availability|w=48]

Use the switch to turn each day on or off, and set the hours you can work on
the days you are available. Press **Save availability** when you are done —
the button only appears once you have changed something.

## A5. Asking for time off

Also on the **Availability** tab, below your weekly hours.

!fig[timeoff-request|w=58]

Enter the first and last day, add a reason if you want to, and press **Request
time off**.

> **Pending is not approved.** Your request sits in Carla's and Irene's queue
> until one of them reviews it. Do not book flights or make commitments until
> it says **Approved**. The app does not send you a notification, so check
> back.

## A6. Swapping a shift

If you cannot work a shift, offer it to the team rather than arranging it
privately — that way the roster stays correct.

**To offer one of yours:** find the shift on your dashboard and press **Offer
swap**. Add a note explaining why if it helps someone decide.

**To pick one up:** go to the **Offers** tab and press **Take this shift** on
anything under **Open offers**.

!fig[offers|w=42]

> Taking a shift is not the end of it. An administrator still has to approve
> the swap. Until the offer reads **Approved**, the original person is still
> rostered and still responsible for the shift.

## A7. Getting your shifts into your normal calendar

You can subscribe to your roster from Google Calendar, iPhone Calendar or
Outlook, so your shifts sit alongside everything else in your life.

**Availability** tab → **Calendar sync**.

!fig[calendar-sync|w=48]

Copy the link and follow the on-screen steps for your calendar app.

> **Two things to know.** Google can take up to 24 hours to notice a change, so
> for anything last-minute the app is right and your calendar may not be. And
> your link is private — anyone who has it can see your roster, so do not
> forward or post it. If it ever gets out, press **Reset link** to kill it.

## A8. Changing your PIN

Tap your initials in the top corner (or your name in the sidebar on a computer)
→ **Change my PIN**. Enter the new one twice.

Do this the first time you sign in, so the starting PIN you were given stops
working.

---

# Part B — For administrators

*Carla and Irene only.*

## B1. How the roster fits together

Two things, and the difference matters:

- The **weekly roster** is the repeating pattern — "Debbie, Mondays,
  8:00–1:00, Hope Island". Change it and every future week changes.
- **Shifts** are the individual dated occurrences generated from that pattern.

You edit the pattern, then press **Build** to generate the dated shifts from
it.

## B2. Choosing the week

Open the **Admin** tab. At the top:

!fig[admin-build|w=100]

Set **Week ending** to the week you are working on. The day columns below then
show that week's actual dates, so you are never guessing which Monday you are
editing.

## B3. Adding and editing shifts

The roster shows as a timeline by default — every shift on one hour axis,
grouped by site. The strip under the clock shows how many people are on, and
**turns red where nobody is**, which is the fastest way to spot a gap.

!fig[admin-roster|w=100]

**By day** gives the same week as a list per day, which is easier for detailed
editing.

!fig[admin-roster-day|w=100]

Tap any shift to edit it, or **New shift** to add one.

!fig[admin-editor|w=54]

Fill in:

- **Staff member**
- **Repeats** — `Once` for a single date, or `Every week`, `Fortnightly` or
  monthly. Choosing anything other than weekly or daily asks for a date to
  count from.
- **Day of week** and **Time** — the hours are totalled for you beside the
  times
- **Location** and **Role**

The editor will **flag** a shift that falls outside that person's stated
availability, and will **block** two shifts starting at the same time for the
same person. A flag is a warning you can save through; a block you cannot.

> Neither check knows anything about the award. Meal breaks, minimum shift
> lengths and ordinary hours are still yours to get right — see §6.3 of the
> Policy and Procedure for the checklist.

**Copy a day** duplicates one day's shifts onto another. For a week that is
much the same every day, this is far quicker than retyping.

## B4. Generating the shifts

Press **Build 8 weeks from here**. This creates the dated shifts from the
pattern for the next eight weeks.

> **Careful on a week you have already published.** Building rebuilds those
> weeks from the pattern, so any one-off change you made directly to a shift in
> that range is lost. Approved swaps are kept. Per the policy this needs the
> Director's authorisation on an already-published week.
>
> **Start fresh** deletes the entire weekly roster and all future shifts. There
> is no undo.

## B5. Checking the week before you publish

**Weekly hours balance** compares what each person is rostered against their
contracted hours.

!fig[admin-hours|w=100]

Anyone well over or under is worth a second look before the roster goes out.

## B6. Approving time off

**Admin** tab → **Time off**. Everything waiting shows here.

!fig[admin-timeoff|w=100]

Check whether the dates land on a week you have already rostered — if they do,
sort out cover before you approve. Add a comment if it helps, then **Approve**
or **Deny**. The person sees your comment.

> **This includes your own leave.** Your requests go into the same queue and
> must be approved by the other administrator, not by you. Carla approves
> Irene's; Irene approves Carla's.

## B7. Approving swaps

**Offers** tab → **Awaiting approval**. Before approving, check the person
taking the shift is right for that role and site, and that it does not push
them over their hours. Approving reassigns the shift immediately.

## B8. Adding someone new

**Admin** tab → **Staff** → **Add a staff member**. You need their full name, a
4-digit starting PIN, and their contract hours per week.

Give them the starting PIN privately and tell them to change it when they first
sign in.

**When someone leaves**, set them to **Inactive** rather than deleting them.
Their access stops immediately and their past shifts stay on the record.

## B9. Resetting a PIN

**Admin** tab → **Staff** → the person → set a new PIN. You cannot see their
old one; nobody can. Hand the new one over privately.

---

## Quick reference

| I want to… | Where |
|---|---|
| See when I'm next working | Dashboard — **Up next** |
| See who else is on today | Dashboard — **Team roster** |
| Change the hours I can work | **Availability** |
| Ask for leave | **Availability** → Time off |
| Give away a shift | Dashboard → **Offer swap** |
| Pick up a shift | **Offers** |
| Get shifts in my phone calendar | **Availability** → Calendar sync |
| Change my PIN | Account menu → **Change my PIN** |
| Add or edit a shift *(admin)* | **Admin** → Weekly roster |
| Approve leave *(admin)* | **Admin** → Time off |
| Approve a swap *(admin)* | **Offers** → Awaiting approval |
| Add a staff member *(admin)* | **Admin** → Staff |

## Who to ask

| | |
|---|---|
| Roster questions, leave, swaps, PIN resets | Carla or Irene |
| The app is broken or will not load | KW Innovations |
