-- Replaces get_email_by_username with a boolean-only check.
-- The old function exposed user emails to any anonymous caller.
-- This version returns only whether the username exists — never the email.

create or replace function public.is_username_taken(p_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where username = lower(trim(p_username))
  );
$$;

-- Allow anon and authenticated to call it (needed for signup availability check)
grant execute on function public.is_username_taken(text) to anon, authenticated;

-- Revoke public access to the old function that returned emails
revoke execute on function public.get_email_by_username(text) from anon;
revoke execute on function public.get_email_by_username(text) from authenticated;
