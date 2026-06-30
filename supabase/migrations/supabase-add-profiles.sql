-- Profiles table — run this in Supabase SQL Editor
CREATE TABLE profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  date_of_birth  date NOT NULL,
  body_weight_kg numeric(5,1) NOT NULL CHECK (body_weight_kg > 0),
  gender         text NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: own data"
  ON profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
