-- Holiday / time-off approvals: staff requests are reviewed by an admin,
-- who approves or denies them and can leave a comment.
alter table unavailability
  add column status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  add column admin_note text,
  add column reviewed_by uuid references staff(id),
  add column reviewed_at timestamptz;

-- existing time off was already in effect, so treat it as approved
update unavailability set status = 'approved' where status = 'pending';
