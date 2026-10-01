-- Signed-in users could rewrite their own access.
--
-- "Users can update own profile" is FOR UPDATE USING (auth.uid() = id) with no column limit,
-- and `authenticated` holds UPDATE on every column, so any user could set their own
-- subscription_tier to 'admin' (or 'season_pass') from the browser console. Verified on the
-- live DB 2026-10-01: has_column_privilege('authenticated', 'public.profiles',
-- 'subscription_tier', 'UPDATE') = true, and no trigger guarded it.
--
-- Who legitimately writes these columns (checked in UFD and TLB, both of which share this DB):
--   browsers  -> product, sleeper_user_id (updates) and a fallback insert with tier 'free'
--   server    -> tier, status, stripe ids, period end via the stripe-webhook and
--                create-checkout-session edge functions (service_role)
--   database  -> trial dates, handle_new_user (SECURITY DEFINER, runs as postgres)
--
-- So the guard applies ONLY to requests made as `authenticated` or `anon`. Everything else
-- (service_role, postgres, the signup trigger, the SQL editor) is untouched.
--
-- IT NEVER RAISES. A browser that sends a protected column gets the old value kept and the
-- rest of its update applied. That's deliberate after the handle_new_user incident, where
-- a side effect vetoed every signup for ten days: a guard must not be able to fail a write.
--
-- SECURITY INVOKER (the default), on purpose: current_user has to be the caller. A
-- SECURITY DEFINER function would always see its owner and guard nothing.

create or replace function public.guard_profile_billing_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    new.subscription_tier       := old.subscription_tier;
    new.subscription_status     := old.subscription_status;
    new.stripe_customer_id      := old.stripe_customer_id;
    new.stripe_subscription_id  := old.stripe_subscription_id;
    new.subscription_period_end := old.subscription_period_end;
    new.trial_started_at        := old.trial_started_at;
    new.trial_expires_at        := old.trial_expires_at;
  else
    -- The browser fallback insert only ever sends tier 'free'; nothing else is the browser's to set.
    new.subscription_tier       := 'free';
    new.subscription_status     := null;
    new.stripe_customer_id      := null;
    new.stripe_subscription_id  := null;
    new.subscription_period_end := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_billing_columns on public.profiles;
create trigger guard_profile_billing_columns
  before insert or update on public.profiles
  for each row execute function public.guard_profile_billing_columns();
