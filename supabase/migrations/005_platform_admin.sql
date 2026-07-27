-- RosterME platform admin: can create new organisations and their first admin.
alter table staff add column is_platform_admin boolean not null default false;

-- the existing Mood & Mind admin account also administers the platform
update staff set is_platform_admin = true where is_admin = true and org_id = (select id from organisations where slug = 'mm');
