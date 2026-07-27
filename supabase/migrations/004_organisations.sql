-- RosterME: multi-organisation support.
-- Every tenant ("workplace") is an organisation; all roster data hangs off one.
-- The Mood & Mind Centre becomes the first organisation (code M&M, slug 'mm').

create table organisations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,          -- URL-safe workplace code, e.g. 'mm'
  name text not null,                 -- display name, e.g. 'The Mood & Mind Centre'
  short_name text,                    -- badge name, e.g. 'M&M'
  domain text unique,                 -- optional custom domain that auto-selects this org
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into organisations (slug, name, short_name)
values ('mm', 'The Mood & Mind Centre', 'M&M');

-- attach every tenant-owned table to an organisation
alter table staff            add column org_id uuid references organisations(id);
alter table locations        add column org_id uuid references organisations(id);
alter table roles            add column org_id uuid references organisations(id);
alter table roster_template  add column org_id uuid references organisations(id);
alter table shift_instances  add column org_id uuid references organisations(id);
alter table availability     add column org_id uuid references organisations(id);
alter table unavailability   add column org_id uuid references organisations(id);
alter table swap_offers      add column org_id uuid references organisations(id);

-- backfill all existing data to The Mood & Mind Centre
update staff           set org_id = (select id from organisations where slug = 'mm');
update locations       set org_id = (select id from organisations where slug = 'mm');
update roles           set org_id = (select id from organisations where slug = 'mm');
update roster_template set org_id = (select id from organisations where slug = 'mm');
update shift_instances set org_id = (select id from organisations where slug = 'mm');
update availability    set org_id = (select id from organisations where slug = 'mm');
update unavailability  set org_id = (select id from organisations where slug = 'mm');
update swap_offers     set org_id = (select id from organisations where slug = 'mm');

alter table staff            alter column org_id set not null;
alter table locations        alter column org_id set not null;
alter table roles            alter column org_id set not null;
alter table roster_template  alter column org_id set not null;
alter table shift_instances  alter column org_id set not null;
alter table availability     alter column org_id set not null;
alter table unavailability   alter column org_id set not null;
alter table swap_offers      alter column org_id set not null;

-- names are now unique per organisation, not globally
alter table locations drop constraint locations_name_key;
alter table roles     drop constraint roles_name_key;
alter table locations add constraint locations_org_name_key unique (org_id, name);
alter table roles     add constraint roles_org_name_key unique (org_id, name);

create index idx_staff_org on staff (org_id);
create index idx_template_org on roster_template (org_id);
create index idx_instances_org on shift_instances (org_id);
create index idx_offers_org on swap_offers (org_id);

-- the org directory is readable (needed pre-login to resolve a workplace code);
-- writes only via service role
alter table organisations enable row level security;
create policy "organisations readable" on organisations for select using (true);
