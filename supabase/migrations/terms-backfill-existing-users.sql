UPDATE profiles
SET
  terms_version     = '1.0',
  terms_accepted_at = now()
WHERE onboarding_completed = true
  AND terms_version IS NULL;
