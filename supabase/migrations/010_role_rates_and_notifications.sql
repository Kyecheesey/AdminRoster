-- 010: hourly pay rates on roles + secret access for email notifications

-- Wage cost estimates: each role carries an hourly rate. 0 means "not set"
-- and the admin dashboard shows no cost until rates are entered.
alter table roles add column hourly_rate numeric not null default 0 check (hourly_rate >= 0);

-- The Resend API key lives in Supabase Vault (inserted out-of-band, never in
-- git). Only the service role — i.e. the edge function — may read it; the
-- browser never sees this function because PostgREST runs it under whatever
-- role the caller holds, and anon/authenticated are revoked below.
create or replace function public.get_secret(secret_name text)
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;

revoke execute on function public.get_secret(text) from public, anon, authenticated;
grant execute on function public.get_secret(text) to service_role;
