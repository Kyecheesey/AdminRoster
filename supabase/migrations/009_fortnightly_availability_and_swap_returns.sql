-- 009: fortnightly (date-based) availability + equal-hours shift swaps

-- Availability is now submitted per date for the upcoming fortnight instead of
-- as a fixed weekly pattern. Old pattern rows carry no date, so they are cleared.
alter table availability add column avail_date date;
delete from availability where avail_date is null;
alter table availability alter column avail_date set not null;
alter table availability drop constraint availability_staff_id_day_of_week_key;
alter table availability add constraint availability_staff_id_avail_date_key unique (staff_id, avail_date);
create index on availability (avail_date);

-- A swap is now shift-for-shift: the acceptor nominates one of their own shifts
-- of the same length to give back to the offerer.
alter table swap_offers add column return_shift_instance_id uuid references shift_instances(id) on delete set null;
