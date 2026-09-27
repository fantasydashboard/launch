-- A side effect must not be able to veto the thing it decorates.
--
-- THE OUTAGE THIS ENDS. Every email signup on BOTH products failed from 2026-09-17 to
-- 2026-09-27 with "Database error saving new user". Ten days, not degraded — zero accounts.
--
-- handle_new_user() is an AFTER INSERT trigger on auth.users that writes two rows: a profile
-- and a preferences row. Somebody added `user_preferences.sport NOT NULL` with no default,
-- directly to the live database — it is in none of these migrations, and the table as created
-- in 001 has no `sport` column at all. The trigger inserts only `user_id`, so `sport` came out
-- NULL, the not-null constraint raised, and because a trigger exception aborts the statement
-- that fired it, the INSERT into auth.users rolled back with it.
--
-- So a settings row that Ultimate Fantasy Dashboard never reads destroyed account creation for
-- two products. Nothing logged it. The client reported "Check your email" whenever the address
-- already existed, which is how it survived ten days of testing.
--
-- THE SHAPE IS THE BUG, NOT THE COLUMN. Setting a default on `sport` fixes today and leaves
-- the trap armed: this database is shared, the other product will add another column, and the
-- next one lands the same way. The fix is that preferences can no longer speak for the account.
--
-- WHY PROFILES STAYS STRICT. It is not symmetrical. profiles is the FK target for nearly every
-- table here and an account without one is broken in ways that surface much later, so that
-- failure should still be loud. Preferences are defaults-with-a-row; their absence costs
-- nothing and UFD does not read the table at all.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Load-bearing. Left able to abort the signup on purpose: see above.
  INSERT INTO public.profiles (id, email, full_name, avatar_url, product)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    CASE
      WHEN NEW.raw_user_meta_data->>'product' IN ('ufd', 'tlb')
        THEN NEW.raw_user_meta_data->>'product'
      ELSE NULL
    END
  );

  /*
   * Best effort, permanently. Any failure here — a column added by either product, a
   * constraint, a type change — is logged and stepped over rather than being allowed to
   * cost a customer. A missing preferences row is recoverable at any time; a signup that
   * never happened is not, and nobody finds out it did not.
   */
  BEGIN
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: user_preferences insert skipped for % — %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
