ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS terms_version text CHECK (terms_version IN ('1.0'));
