-- One materialised instance per template shift per date, regardless of who
-- currently holds it (prevents re-generating a shift that was swapped away)
create unique index shift_instances_template_date_key
  on shift_instances (template_id, shift_date)
  where template_id is not null;

-- Security advisor: the RLS helper functions don't need to be callable via the REST RPC API
revoke execute on function public.is_admin() from anon, authenticated, public;
revoke execute on function public.current_staff_id() from anon, authenticated, public;
