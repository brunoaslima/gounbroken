-- Make body measurements optional — enforced by client-side validation in onboarding,
-- not by DB constraints. Stubs created before the user fills Step 3 were violating
-- the > 0 checks, silently breaking the entire onboarding profile creation flow.
ALTER TABLE profiles ALTER COLUMN body_weight_kg DROP NOT NULL;
ALTER TABLE profiles ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_body_weight_kg_check;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_height_cm_check;
