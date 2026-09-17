-- Which product a person signed up through.
--
-- WHY. Ultimate Fantasy Dashboard and The League Beat share this database, this profiles
-- table and this auth schema, and nothing has ever recorded which site created an account.
-- Two consequences, both live:
--
--   1. Every number on UFD's admin page — signups, signups per day, conversion — is a blend
--      of two businesses, and neither can be measured.
--   2. The two products disagree about what profiles.trial_expires_at MEANS. The League Beat
--      grants full access during the trial; UFD retired it. The same column, read as an
--      entitlement by one product and as an analytics timestamp by the other, was letting one
--      product consume the other's trial.
--
-- Backfill is impossible. The signup payloads were byte-identical (`data: { full_name }`) and
-- the products have overlapped since The League Beat's first commit in May 2026, so no date
-- cutoff separates them either. Existing rows stay NULL, which is the honest value: unknown,
-- not "assume it was ours".

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS product text;

COMMENT ON COLUMN public.profiles.product IS
  'Which app created this account: ufd | tlb. NULL for accounts created before 2026-09-17, '
  'when neither app recorded it — unknown, never assume.';

-- Only values we actually ship, so a typo in a client fails loudly instead of creating a
-- third silent product.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_product_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_product_check
  CHECK (product IS NULL OR product IN ('ufd', 'tlb'));

CREATE INDEX IF NOT EXISTS profiles_product_created_idx
  ON public.profiles (product, created_at DESC);

-- Carry the client's declared origin from auth metadata onto the profile at creation.
--
-- Additive only: every other column keeps its existing behaviour, and a client that sends no
-- origin still gets a row, with product NULL. That matters because this trigger fires for
-- BOTH products and a stricter version would break signups on whichever one deploys second.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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

  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
