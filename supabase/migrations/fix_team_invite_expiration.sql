-- Add expiration to team member invites (mirrors judge invite 7-day TTL)
ALTER TABLE competition_team_members
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill existing pending invites with 7-day expiration from now
UPDATE competition_team_members
SET expires_at = now() + INTERVAL '7 days'
WHERE status = 'invited' AND expires_at IS NULL;

-- Set default for future invites
ALTER TABLE competition_team_members
  ALTER COLUMN expires_at SET DEFAULT (now() + INTERVAL '7 days');
