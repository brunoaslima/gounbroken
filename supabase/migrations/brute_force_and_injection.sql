-- ── Brute Force Protection + Prompt Injection Defense ───────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Fixes: M-1 (injection in student_comment), M-3 (brute force on login)


-- ── M-3: login_attempts table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username     TEXT        NOT NULL,
  ip           TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS on with no policies → service_role (edge function) has full access,
-- anon/authenticated have zero access.
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient count queries by username/IP within a time window
CREATE INDEX IF NOT EXISTS login_attempts_username_time ON login_attempts (username, attempted_at);
CREATE INDEX IF NOT EXISTS login_attempts_ip_time       ON login_attempts (ip, attempted_at);
CREATE INDEX IF NOT EXISTS login_attempts_time          ON login_attempts (attempted_at);


-- ── M-1: is_safe_text helper ─────────────────────────────────────────────
-- Detects prompt injection patterns in free-text fields stored in the DB.
-- Normalizes leetspeak (0→o, 1→i, 3→e, @→a) before pattern matching.
CREATE OR REPLACE FUNCTION is_safe_text(p_text TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_text IS NULL THEN TRUE
    ELSE
      lower(translate(p_text, '013@', 'oiea'))
        !~ 'ignore.{0,15}(all|previous|tudo|prompt|everything|instructions)'
      AND lower(translate(p_text, '013@', 'oiea'))
        !~ '(you are now|voce agora|act as|jailbreak|system:|new instruction|forget everything|esqueca tudo|pretend you|finja que|\[\[|###\s*instruct|override.{0,10}(system|instructions|prompt))'
  END
$$;


-- ── M-1: save_workout_feedback with injection guard ──────────────────────
-- Replaces the version from security_hardening.sql — adds is_safe_text check
-- on student_comment in addition to the existing ownership validation.
CREATE OR REPLACE FUNCTION save_workout_feedback(
  p_workout_id           UUID,
  p_status               TEXT,
  p_enjoyment            TEXT DEFAULT NULL,
  p_perceived_difficulty TEXT DEFAULT NULL,
  p_student_comment      TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ensure the workout belongs to the calling user
  IF NOT EXISTS (
    SELECT 1 FROM prescribed_workouts
    WHERE id = p_workout_id
      AND athlete_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Reject injection attempts in free-text comment
  IF NOT is_safe_text(p_student_comment) THEN
    RAISE EXCEPTION 'Conteúdo inválido';
  END IF;

  -- Cap comment length
  IF length(p_student_comment) > 300 THEN
    RAISE EXCEPTION 'Conteúdo inválido';
  END IF;

  INSERT INTO workout_feedback (
    workout_id, student_id, status, enjoyment,
    perceived_difficulty, student_comment, completed_at
  )
  VALUES (
    p_workout_id,
    auth.uid(),
    p_status,
    p_enjoyment,
    p_perceived_difficulty,
    p_student_comment,
    CASE WHEN p_status IN ('completed', 'partially_completed') THEN NOW() ELSE NULL END
  )
  ON CONFLICT (workout_id, student_id) DO UPDATE SET
    status               = EXCLUDED.status,
    enjoyment            = EXCLUDED.enjoyment,
    perceived_difficulty = EXCLUDED.perceived_difficulty,
    student_comment      = EXCLUDED.student_comment,
    completed_at         = CASE
                             WHEN EXCLUDED.status IN ('completed', 'partially_completed')
                             THEN COALESCE(workout_feedback.completed_at, NOW())
                             ELSE NULL
                           END,
    updated_at           = NOW();
END;
$$;
