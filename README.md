# Admin Roster

A small staff rostering app for the centre admin team: a **fixed weekly roster**, staff
**availability**, and **shift-swap offers** with admin approval.

- **Live app:** deployed on Vercel (project `adminroster`)
- **Backend:** Supabase project `AdminRoster` (`qozhbbkylgwbhhlcjako`, ap-southeast-2)

## How it works

- **Login** — staff pick their name and enter a 4-digit PIN (no emails needed). PINs are
  stored salted + hashed; sessions are signed tokens valid for 30 days. Admin can reset any
  PIN in the Admin tab.
- **Calendar** — the fixed weekly roster template is materialised into dated shifts as
  weeks are viewed. Staff see their own shifts (or everyone's), with locations
  (Hope Island / Upper Coomera) and roles (Centre Admin / Mood Admin) per shift.
- **Availability** — each staff member maintains a recurring weekly availability pattern
  plus one-off "time off / away" date ranges, which show on the calendar.
- **Offers (shift swaps)** — a staff member offers one of their upcoming shifts; another
  staff member takes it; the swap then goes to the admin for approval. On approval the
  shift is reassigned on the roster and marked "swapped".
- **Admin** — edit the fixed weekly roster template, re-apply it to the next 8 weeks,
  manage staff (add, disable, reset PIN, contract hours), and approve/decline swaps.

## Architecture

```
web/                      Vite + React SPA (deployed to Vercel as a static site)
supabase/functions/api/   Single Deno edge function: PIN auth + all API routes
supabase/migrations/      Database schema + seed (applied via Supabase MCP)
```

The browser never talks to the database directly — every request goes through the edge
function, which validates the signed session token and uses the service-role key
server-side. Row-level security is enabled on all tables as defence in depth.

## Data model

| Table | Purpose |
|---|---|
| `staff` | People + hashed PIN, contract hours, admin flag |
| `locations`, `roles` | Hope Island / Upper Coomera; Centre Admin / Mood Admin |
| `roster_template` | The fixed weekly roster (day-of-week + times per person) |
| `shift_instances` | Dated shifts generated from the template; reassigned on swaps |
| `availability` | Recurring weekly availability per person |
| `unavailability` | One-off leave/away date ranges |
| `swap_offers` | Offer → accept → admin approve/reject lifecycle |

`day_of_week`: 0 = Monday … 6 = Sunday.

## Local development

```bash
cd web
npm install
npm run dev
```

The API base URL is set in `web/src/api.js`. The edge function is deployed with
`verify_jwt: false` because it implements its own PIN/session auth (see
`supabase/functions/api/index.ts`).

## Seed data

The initial fixed roster was imported from the "WS 1 June" week of the 2026 roster
spreadsheet, with all shifts defaulted to the Centre Admin role (retag individual template
shifts in the Admin tab). Staff availability was imported from the spreadsheet's
availability rows.
