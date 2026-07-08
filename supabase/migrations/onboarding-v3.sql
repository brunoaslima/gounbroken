-- Onboarding v3: nationality, avatar_url, onboarding_step

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nationality     TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url      TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_step INT NOT NULL DEFAULT 0;

-- Security: enforce ISO-3166-1 alpha-2 and HTTPS-only avatar URLs
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_nationality_iso2;
ALTER TABLE profiles ADD CONSTRAINT profiles_nationality_iso2
  CHECK (nationality IS NULL OR nationality ~ '^[A-Z]{2}$');

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_https;
ALTER TABLE profiles ADD CONSTRAINT profiles_avatar_url_https
  CHECK (avatar_url IS NULL OR avatar_url LIKE 'https://%');

-- Storage: public avatars bucket (5 MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: each user controls only their own folder
DROP POLICY IF EXISTS "avatar: own upload"       ON storage.objects;
DROP POLICY IF EXISTS "avatar: own update"       ON storage.objects;
DROP POLICY IF EXISTS "avatar: own delete"       ON storage.objects;
DROP POLICY IF EXISTS "avatar: public read"      ON storage.objects;

CREATE POLICY "avatar: own upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar: own update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar: own delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
