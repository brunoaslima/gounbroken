-- 1. Update profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS username text UNIQUE,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
    CHECK (role IN ('admin', 'personal', 'box_admin', 'user'));

-- 2. Drop old profile RLS and add admin-aware one
DROP POLICY IF EXISTS "own profiles" ON profiles;
CREATE POLICY "profiles access" ON profiles
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p2 WHERE p2.user_id = auth.uid() AND p2.role = 'admin'
    )
  )
  WITH CHECK (auth.uid() = user_id);

-- 3. Weight history table
CREATE TABLE IF NOT EXISTS weight_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg numeric(5,2) NOT NULL,
  recorded_at date NOT NULL DEFAULT current_date,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own weight history" ON weight_history;
CREATE POLICY "own weight history" ON weight_history
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Username → email lookup (used for username login, SECURITY DEFINER bypasses RLS)
-- get_email_by_username removed — exposed user emails to any authenticated caller.
-- Replaced by secure_username_check.sql + login-by-username Edge Function.

-- 5. Future: organizations scaffold
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  type text NOT NULL CHECK (type IN ('personal', 'box')),
  owner_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- 6. After registering as admin, run this (replace with your email):
-- UPDATE profiles SET role = 'admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your@email.com');
