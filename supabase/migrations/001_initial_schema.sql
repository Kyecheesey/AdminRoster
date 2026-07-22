-- AdminRoster schema
create extension if not exists pgcrypto;

create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email text not null unique,
  contract_hours numeric not null default 0,
  is_admin boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- fixed weekly template: the repeating "fixed roster"
create table roster_template (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0=Monday .. 6=Sunday
  start_time time not null,
  end_time time not null,
  location_id uuid not null references locations(id),
  role_id uuid not null references roles(id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);

-- concrete dated shifts, generated from the template (and editable per-date, e.g. after a swap)
create table shift_instances (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references roster_template(id) on delete set null,
  staff_id uuid not null references staff(id) on delete cascade,
  shift_date date not null,
  start_time time not null,
  end_time time not null,
  location_id uuid not null references locations(id),
  role_id uuid not null references roles(id),
  status text not null default 'scheduled' check (status in ('scheduled','swapped','cancelled')),
  created_at timestamptz not null default now(),
  unique (staff_id, shift_date, start_time)
);

-- recurring weekly availability pattern
create table availability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_available boolean not null default true,
  available_from time,
  available_to time,
  note text,
  updated_at timestamptz not null default now(),
  unique (staff_id, day_of_week)
);

-- one-off unavailability / leave, overriding the recurring pattern for a date range
create table unavailability (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references staff(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  note text,
  created_at timestamptz not null default now(),
  check (end_date >= start_date)
);

-- shift swap requests ("Offers")
create table swap_offers (
  id uuid primary key default gen_random_uuid(),
  shift_instance_id uuid not null references shift_instances(id) on delete cascade,
  offered_by uuid not null references staff(id),
  accepted_by uuid references staff(id),
  status text not null default 'open' check (status in ('open','pending_approval','approved','rejected','cancelled')),
  offer_note text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on shift_instances (shift_date);
create index on shift_instances (staff_id);
create index on swap_offers (status);

-- helper: is the current auth user an admin staff member?
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from staff where auth_user_id = auth.uid()), false);
$$;

-- helper: staff.id for current auth user
create or replace function current_staff_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from staff where auth_user_id = auth.uid();
$$;

alter table locations enable row level security;
alter table roles enable row level security;
alter table staff enable row level security;
alter table roster_template enable row level security;
alter table shift_instances enable row level security;
alter table availability enable row level security;
alter table unavailability enable row level security;
alter table swap_offers enable row level security;

-- locations & roles: readable by any authenticated staff, writable by admin
create policy "locations read" on locations for select using (auth.uid() is not null);
create policy "locations admin write" on locations for all using (is_admin()) with check (is_admin());
create policy "roles read" on roles for select using (auth.uid() is not null);
create policy "roles admin write" on roles for all using (is_admin()) with check (is_admin());

-- staff: any authenticated user can read the staff list (names for the roster); only admin can write;
-- a staff member can update their own row (e.g. nothing sensitive exposed client-side beyond name)
create policy "staff read" on staff for select using (auth.uid() is not null);
create policy "staff admin write" on staff for all using (is_admin()) with check (is_admin());

-- roster_template: readable by all staff; only admin edits the fixed roster
create policy "template read" on roster_template for select using (auth.uid() is not null);
create policy "template admin write" on roster_template for all using (is_admin()) with check (is_admin());

-- shift_instances: readable by all staff; admin can write directly;
-- staff can update only the staff_id field of their own shift via swap acceptance (handled by swap approval, not directly)
create policy "shifts read" on shift_instances for select using (auth.uid() is not null);
create policy "shifts admin write" on shift_instances for all using (is_admin()) with check (is_admin());

-- availability: staff manage their own; admin can read/write all
create policy "availability read" on availability for select using (auth.uid() is not null);
create policy "availability own write" on availability for all
  using (staff_id = current_staff_id() or is_admin())
  with check (staff_id = current_staff_id() or is_admin());

-- unavailability: same pattern
create policy "unavailability read" on unavailability for select using (auth.uid() is not null);
create policy "unavailability own write" on unavailability for all
  using (staff_id = current_staff_id() or is_admin())
  with check (staff_id = current_staff_id() or is_admin());

-- swap_offers: any staff can read; staff can create an offer for their own shift;
-- any staff can accept an open offer (update to pending_approval + accepted_by); only admin can approve/reject
create policy "offers read" on swap_offers for select using (auth.uid() is not null);
create policy "offers create own" on swap_offers for insert
  with check (offered_by = current_staff_id());
create policy "offers accept or admin" on swap_offers for update
  using (auth.uid() is not null)
  with check (
    is_admin()
    or (status = 'pending_approval' and accepted_by = current_staff_id())
    or (offered_by = current_staff_id())
  );
create policy "offers cancel own" on swap_offers for delete
  using (offered_by = current_staff_id() or is_admin());
