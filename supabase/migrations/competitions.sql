-- ─────────────────────────────────────────────────────────────────────────────
-- COMPETITIONS MODULE
-- Idempotent migration: DROP … CASCADE at the top, CREATE OR REPLACE everywhere.
-- Stack: React 18 + Vite 5 + TypeScript · Supabase (Postgres + RLS + Edge Fns)
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── TEAR DOWN (run-safe) ────────────────────────────────────────────────────

DROP TABLE IF EXISTS competition_audit_log       CASCADE;
DROP TABLE IF EXISTS competition_results         CASCADE;
DROP TABLE IF EXISTS competition_judge_invites   CASCADE;
DROP TABLE IF EXISTS competition_roles           CASCADE;
DROP TABLE IF EXISTS competition_team_members    CASCADE;
DROP TABLE IF EXISTS competition_teams           CASCADE;
DROP TABLE IF EXISTS competition_wods            CASCADE;
DROP TABLE IF EXISTS competitions                CASCADE;

DROP FUNCTION IF EXISTS is_global_admin()                                         CASCADE;
DROP FUNCTION IF EXISTS is_competition_head_judge(UUID)                           CASCADE;
DROP FUNCTION IF EXISTS create_competition_team(UUID, TEXT, TEXT)                 CASCADE;
DROP FUNCTION IF EXISTS invite_team_member(UUID, UUID, TEXT)                      CASCADE;
DROP FUNCTION IF EXISTS respond_team_invite(UUID, BOOL)                           CASCADE;
DROP FUNCTION IF EXISTS invite_judge_by_username(UUID, TEXT)                      CASCADE;
DROP FUNCTION IF EXISTS accept_judge_invite(UUID)                                 CASCADE;
DROP FUNCTION IF EXISTS manage_team(UUID, TEXT, TEXT)                             CASCADE;
DROP FUNCTION IF EXISTS submit_competition_result(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS override_competition_result(UUID, TEXT, NUMERIC, TEXT)    CASCADE;
DROP FUNCTION IF EXISTS publish_wod_results(UUID)                                 CASCADE;
DROP FUNCTION IF EXISTS get_competition_leaderboard(UUID)                         CASCADE;
DROP FUNCTION IF EXISTS search_athletes_for_invite(TEXT)                          CASCADE;
DROP FUNCTION IF EXISTS get_profiles_public(UUID[])                               CASCADE;


-- ─────────────────────────────────────────────────────────────────────────────
-- TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── competitions ─────────────────────────────────────────────────────────────
CREATE TABLE competitions (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT        NOT NULL,
  description             TEXT,
  venue                   TEXT,                                          -- e.g. "CF Pinheiros · SP"
  start_date              DATE        NOT NULL,
  registration_deadline   TIMESTAMPTZ NOT NULL,
  team_min_size           INT         NOT NULL DEFAULT 2,
  team_max_size           INT         NOT NULL DEFAULT 4,
  status                  TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed','in_progress','finished')),
  created_by              UUID        REFERENCES auth.users(id),
  public_slug             TEXT        UNIQUE,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ─── competition_wods ────────────────────────────────────────────────────────
CREATE TABLE competition_wods (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  description     TEXT,
  order_index     INT         NOT NULL,
  score_type      TEXT        NOT NULL
    CHECK (score_type IN ('time','reps','weight','rounds_plus_reps')),
  score_order     TEXT        NOT NULL DEFAULT 'desc'
    CHECK (score_order IN ('asc','desc')),             -- asc = lower is better (time); desc = higher is better
  cap             TEXT,                                -- display string e.g. "15 MIN"
  status          TEXT        NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','published')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── competition_teams ───────────────────────────────────────────────────────
CREATE TABLE competition_teams (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id    UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  captain_user_id   UUID        REFERENCES auth.users(id),
  box               TEXT,                              -- CrossFit box name, optional
  status            TEXT        NOT NULL DEFAULT 'pending_members'
    CHECK (status IN ('pending_members','pending_payment','pending_approval','approved','rejected','cancelled')),
  payment_status    TEXT        NOT NULL DEFAULT 'not_required'
    CHECK (payment_status IN ('not_required','pending','paid','failed','refunded','manually_confirmed')),
  checked_in        BOOLEAN     NOT NULL DEFAULT false,  -- day-of check-in
  rejection_reason  TEXT,
  approved_at       TIMESTAMPTZ,
  rejected_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── competition_team_members ────────────────────────────────────────────────
CREATE TABLE competition_team_members (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id         UUID        NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES auth.users(id),   -- null for email/username invites not yet linked
  team_role       TEXT        NOT NULL DEFAULT 'athlete'
    CHECK (team_role IN ('captain','athlete')),
  status          TEXT        NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited','accepted','rejected','removed')),
  payment_status  TEXT        NOT NULL DEFAULT 'not_required'
    CHECK (payment_status IN ('not_required','pending','paid','failed','refunded','manually_confirmed')),
  invited_email   TEXT,                                    -- raw email or '@username' string
  invited_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ─── competition_roles ───────────────────────────────────────────────────────
CREATE TABLE competition_roles (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES auth.users(id),
  role             TEXT        NOT NULL
    CHECK (role IN ('head_judge','judge','athlete')),
  assigned_wod_ids UUID[],                              -- WOD IDs this judge is assigned to score
  created_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

-- ─── competition_judge_invites ───────────────────────────────────────────────
CREATE TABLE competition_judge_invites (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id   UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  invited_user_id  UUID        REFERENCES auth.users(id),
  invited_email    TEXT,                                -- '@username' or 'email@...'
  invited_by       UUID        NOT NULL REFERENCES auth.users(id),
  status           TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired')),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ─── competition_results ─────────────────────────────────────────────────────
CREATE TABLE competition_results (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  wod_id          UUID        NOT NULL REFERENCES competition_wods(id) ON DELETE CASCADE,
  team_id         UUID        NOT NULL REFERENCES competition_teams(id) ON DELETE CASCADE,
  submitted_by    UUID        REFERENCES auth.users(id),
  raw_result      TEXT        NOT NULL,                -- display string e.g. "8:42" or "247" or "85 kg"
  score_numeric   NUMERIC,                             -- for sorting; TIME stored as negative seconds (lower = worse)
  score_type      TEXT
    CHECK (score_type IN ('time','reps','weight','rounds_plus_reps')),
  notes           TEXT,
  status          TEXT        NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','reviewed','published')),
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  UNIQUE (wod_id, team_id)
);

-- ─── competition_audit_log ───────────────────────────────────────────────────
-- General audit covering all head-judge actions.
CREATE TABLE competition_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id  UUID        NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  changed_by      UUID        NOT NULL REFERENCES auth.users(id),
  action          TEXT        NOT NULL
    CHECK (action IN (
      'result_update','result_override','wod_published',
      'team_approved','team_rejected','team_payment_confirmed',
      'team_checked_in','team_cancelled'
    )),
  target_type     TEXT        CHECK (target_type IN ('team','wod','result')),
  target_id       UUID,
  target_label    TEXT,        -- team name or WOD name for display
  from_value      TEXT,
  to_value        TEXT,
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX ON competition_wods         (competition_id, order_index);
CREATE INDEX ON competition_teams        (competition_id);
CREATE INDEX ON competition_teams        (captain_user_id);
CREATE INDEX ON competition_team_members (team_id);
CREATE INDEX ON competition_team_members (user_id);
CREATE INDEX ON competition_roles        (competition_id, user_id);
CREATE INDEX ON competition_results      (wod_id, team_id);
CREATE INDEX ON competition_results      (competition_id);
CREATE INDEX ON competition_audit_log    (competition_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE competitions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_wods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_teams         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_roles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_judge_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_audit_log     ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- Created before policies so policies can call them.
-- ─────────────────────────────────────────────────────────────────────────────

-- Returns true when the calling user has the 'admin' role in profiles.
CREATE OR REPLACE FUNCTION is_global_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
      AND roles @> ARRAY['admin']
  );
$$;

-- Returns true when the calling user is head_judge for the given competition.
CREATE OR REPLACE FUNCTION is_competition_head_judge(p_competition_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM competition_roles
    WHERE competition_id = p_competition_id
      AND user_id = auth.uid()
      AND role = 'head_judge'
  );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── competitions ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "comp: anon read public" ON competitions;
CREATE POLICY "comp: anon read public" ON competitions
  FOR SELECT TO anon
  USING (status IN ('open','in_progress','finished'));

DROP POLICY IF EXISTS "comp: auth read" ON competitions;
CREATE POLICY "comp: auth read" ON competitions
  FOR SELECT TO authenticated
  USING (
    status IN ('open','in_progress','finished')
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM competition_roles cr
      WHERE cr.competition_id = competitions.id
        AND cr.user_id = auth.uid()
    )
    OR is_global_admin()
  );

-- No direct INSERT/UPDATE allowed — go through SECURITY DEFINER RPCs.

-- ─── competition_wods ─────────────────────────────────────────────────────────
-- WODs themselves are publicly readable; the competition access gate is upstream.
DROP POLICY IF EXISTS "wods: anon read" ON competition_wods;
CREATE POLICY "wods: anon read" ON competition_wods
  FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "wods: auth read" ON competition_wods;
CREATE POLICY "wods: auth read" ON competition_wods
  FOR SELECT TO authenticated
  USING (true);

-- ─── competition_teams ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "teams: auth read" ON competition_teams;
CREATE POLICY "teams: auth read" ON competition_teams
  FOR SELECT TO authenticated
  USING (
    captain_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM competition_team_members ctm
      WHERE ctm.team_id = competition_teams.id
        AND ctm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM competition_roles cr
      WHERE cr.competition_id = competition_teams.competition_id
        AND cr.user_id = auth.uid()
    )
    OR is_global_admin()
  );

-- ─── competition_team_members ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "team_members: auth read" ON competition_team_members;
CREATE POLICY "team_members: auth read" ON competition_team_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    -- matches if this is an email invite sent to the caller's email
    OR (
      invited_email IS NOT NULL
      AND invited_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
    -- caller is captain of this team
    OR EXISTS (
      SELECT 1 FROM competition_teams ct
      WHERE ct.id = competition_team_members.team_id
        AND ct.captain_user_id = auth.uid()
    )
    -- caller has a competition role (judge/head_judge/athlete)
    OR EXISTS (
      SELECT 1 FROM competition_roles cr
      JOIN competition_teams ct ON ct.id = competition_team_members.team_id
      WHERE cr.competition_id = ct.competition_id
        AND cr.user_id = auth.uid()
    )
    OR is_global_admin()
  );

-- ─── competition_roles ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "roles: auth read" ON competition_roles;
CREATE POLICY "roles: auth read" ON competition_roles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_competition_head_judge(competition_id)
    OR is_global_admin()
  );

-- ─── competition_judge_invites ────────────────────────────────────────────────
DROP POLICY IF EXISTS "judge_invites: auth read" ON competition_judge_invites;
CREATE POLICY "judge_invites: auth read" ON competition_judge_invites
  FOR SELECT TO authenticated
  USING (
    invited_user_id = auth.uid()
    OR invited_by = auth.uid()
    OR is_competition_head_judge(competition_id)
    OR is_global_admin()
  );

-- ─── competition_results ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "results: anon read published" ON competition_results;
CREATE POLICY "results: anon read published" ON competition_results
  FOR SELECT TO anon
  USING (status = 'published');

DROP POLICY IF EXISTS "results: auth read" ON competition_results;
CREATE POLICY "results: auth read" ON competition_results
  FOR SELECT TO authenticated
  USING (
    -- team member
    EXISTS (
      SELECT 1 FROM competition_team_members ctm
      WHERE ctm.team_id = competition_results.team_id
        AND ctm.user_id = auth.uid()
    )
    -- competition role (judges see all results)
    OR EXISTS (
      SELECT 1 FROM competition_roles cr
      WHERE cr.competition_id = competition_results.competition_id
        AND cr.user_id = auth.uid()
    )
    OR is_global_admin()
  );

-- ─── competition_audit_log ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "audit_log: auth read" ON competition_audit_log;
CREATE POLICY "audit_log: auth read" ON competition_audit_log
  FOR SELECT TO authenticated
  USING (
    is_competition_head_judge(competition_id)
    OR is_global_admin()
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- RPCs
-- All SECURITY DEFINER · set search_path = public
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── create_competition_team ─────────────────────────────────────────────────
-- Creates a team and auto-enrols the caller as captain.
CREATE OR REPLACE FUNCTION create_competition_team(
  p_competition_id  UUID,
  p_name            TEXT,
  p_box             TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_comp    competitions%ROWTYPE;
BEGIN
  SELECT * INTO v_comp FROM competitions WHERE id = p_competition_id;

  IF v_comp.id IS NULL THEN
    RAISE EXCEPTION 'Competition not found';
  END IF;

  IF v_comp.status NOT IN ('open') THEN
    RAISE EXCEPTION 'Competition is not open for registration';
  END IF;

  IF now() > v_comp.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- One team per user per competition
  IF EXISTS (
    SELECT 1 FROM competition_teams ct
    JOIN competition_team_members ctm ON ctm.team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ctm.user_id = auth.uid()
      AND ctm.status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'You already belong to a team in this competition';
  END IF;

  INSERT INTO competition_teams (competition_id, name, captain_user_id, box)
  VALUES (p_competition_id, p_name, auth.uid(), p_box)
  RETURNING id INTO v_team_id;

  INSERT INTO competition_team_members (team_id, user_id, team_role, status, invited_by)
  VALUES (v_team_id, auth.uid(), 'captain', 'accepted', auth.uid());

  -- Register caller as athlete role in competition (enables judge/admin visibility)
  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (p_competition_id, auth.uid(), 'athlete')
  ON CONFLICT (competition_id, user_id) DO NOTHING;

  RETURN v_team_id;
END;
$$;

-- ─── invite_team_member ──────────────────────────────────────────────────────
-- Caller must be captain. Accepts either a linked user_id or an email/username string.
CREATE OR REPLACE FUNCTION invite_team_member(
  p_team_id       UUID,
  p_user_id       UUID    DEFAULT NULL,
  p_invited_email TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id     UUID;
  v_team          competition_teams%ROWTYPE;
  v_member_count  INT;
  v_max_size      INT;
BEGIN
  SELECT * INTO v_team FROM competition_teams WHERE id = p_team_id;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF v_team.captain_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the captain can invite members';
  END IF;

  SELECT team_max_size INTO v_max_size
  FROM competitions WHERE id = v_team.competition_id;

  -- Count non-removed members to check capacity
  SELECT COUNT(*) INTO v_member_count
  FROM competition_team_members
  WHERE team_id = p_team_id
    AND status <> 'removed';

  IF v_member_count >= v_max_size THEN
    RAISE EXCEPTION 'Team is already at maximum size (% members)', v_max_size;
  END IF;

  INSERT INTO competition_team_members (team_id, user_id, team_role, status, invited_email, invited_by)
  VALUES (p_team_id, p_user_id, 'athlete', 'invited', p_invited_email, auth.uid())
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

-- ─── respond_team_invite ─────────────────────────────────────────────────────
-- Called by the invited person to accept or reject their invite.
CREATE OR REPLACE FUNCTION respond_team_invite(
  p_member_id UUID,
  p_accept    BOOL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member     competition_team_members%ROWTYPE;
  v_team       competition_teams%ROWTYPE;
  v_comp       competitions%ROWTYPE;
  v_accepted   INT;
  v_min_size   INT;
  v_caller_email TEXT;
BEGIN
  SELECT * INTO v_member FROM competition_team_members WHERE id = p_member_id;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  -- Verify caller is the invited person (by user_id or matching email)
  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

  IF v_member.user_id IS NOT NULL AND v_member.user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  IF v_member.user_id IS NULL
     AND (v_member.invited_email IS NULL OR v_member.invited_email <> v_caller_email) THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  IF v_member.status <> 'invited' THEN
    RAISE EXCEPTION 'Invite is no longer pending';
  END IF;

  UPDATE competition_team_members
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      -- link user_id if invite was by email and now we know who accepted
      user_id = COALESCE(v_member.user_id, auth.uid())
  WHERE id = p_member_id;

  IF NOT p_accept THEN
    RETURN;
  END IF;

  -- If accepted: check if team has reached minimum size → auto-advance status
  SELECT * INTO v_team FROM competition_teams WHERE id = v_member.team_id;
  SELECT * INTO v_comp FROM competitions WHERE id = v_team.competition_id;

  SELECT COUNT(*) INTO v_accepted
  FROM competition_team_members
  WHERE team_id = v_member.team_id
    AND status = 'accepted';

  IF v_accepted >= v_comp.team_min_size AND v_team.status = 'pending_members' THEN
    -- Advance to pending_payment if payment is expected, otherwise pending_approval
    UPDATE competition_teams
    SET status     = 'pending_approval',
        updated_at = now()
    WHERE id = v_member.team_id;
  END IF;

  -- Register the new member as athlete role in the competition
  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_team.competition_id, auth.uid(), 'athlete')
  ON CONFLICT (competition_id, user_id) DO NOTHING;
END;
$$;

-- ─── invite_judge_by_username ─────────────────────────────────────────────────
-- Head judge or admin invites a user by their @username handle.
CREATE OR REPLACE FUNCTION invite_judge_by_username(
  p_competition_id UUID,
  p_username       TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id    UUID;
  v_target_uid   UUID;
BEGIN
  IF NOT (is_competition_head_judge(p_competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'Only the head judge or an admin can invite judges';
  END IF;

  -- Resolve username → user_id
  SELECT user_id INTO v_target_uid
  FROM profiles
  WHERE lower(username) = lower(trim(p_username));

  -- Allow invite even when user not found yet (stores username as invited_email for lookup later)
  IF EXISTS (
    SELECT 1 FROM competition_judge_invites
    WHERE competition_id = p_competition_id
      AND (
        (v_target_uid IS NOT NULL AND invited_user_id = v_target_uid)
        OR lower(invited_email) = lower(trim(p_username))
      )
      AND status IN ('pending','accepted')
  ) THEN
    RAISE EXCEPTION 'This user already has an active invite for this competition';
  END IF;

  INSERT INTO competition_judge_invites
    (competition_id, invited_user_id, invited_email, invited_by)
  VALUES
    (p_competition_id, v_target_uid, trim(p_username), auth.uid())
  RETURNING id INTO v_invite_id;

  RETURN v_invite_id;
END;
$$;

-- ─── accept_judge_invite ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION accept_judge_invite(
  p_invite_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite competition_judge_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM competition_judge_invites WHERE id = p_invite_id;

  IF v_invite.id IS NULL THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.invited_user_id IS NOT NULL AND v_invite.invited_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not your invite';
  END IF;

  IF v_invite.status <> 'pending' THEN
    RAISE EXCEPTION 'Invite is no longer pending (status: %)', v_invite.status;
  END IF;

  IF now() > v_invite.expires_at THEN
    UPDATE competition_judge_invites SET status = 'expired' WHERE id = p_invite_id;
    RAISE EXCEPTION 'Invite has expired';
  END IF;

  UPDATE competition_judge_invites
  SET status      = 'accepted',
      accepted_at = now(),
      invited_user_id = COALESCE(v_invite.invited_user_id, auth.uid())
  WHERE id = p_invite_id;

  INSERT INTO competition_roles (competition_id, user_id, role)
  VALUES (v_invite.competition_id, auth.uid(), 'judge')
  ON CONFLICT (competition_id, user_id) DO NOTHING;
END;
$$;

-- ─── manage_team ─────────────────────────────────────────────────────────────
-- Head judge / admin performs lifecycle actions on a team.
-- p_action: 'approve' | 'reject' | 'cancel' | 'request_payment' | 'confirm_payment' | 'check_in'
CREATE OR REPLACE FUNCTION manage_team(
  p_team_id UUID,
  p_action  TEXT,
  p_reason  TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team         competition_teams%ROWTYPE;
  v_audit_action TEXT;
  v_pending_count INT;
BEGIN
  SELECT * INTO v_team FROM competition_teams WHERE id = p_team_id;

  IF v_team.id IS NULL THEN
    RAISE EXCEPTION 'Team not found';
  END IF;

  IF NOT (is_competition_head_judge(v_team.competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  CASE p_action
    WHEN 'approve' THEN
      SELECT COUNT(*) INTO v_pending_count
      FROM competition_team_members
      WHERE team_id = p_team_id AND status = 'invited';

      IF v_pending_count > 0 THEN
        RAISE EXCEPTION 'Existem % membro(s) com convite pendente. Todos devem aceitar antes de aprovar a equipe.', v_pending_count;
      END IF;

      UPDATE competition_teams
      SET status      = 'approved',
          approved_at = now(),
          updated_at  = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_approved';

    WHEN 'reject' THEN
      UPDATE competition_teams
      SET status           = 'rejected',
          rejection_reason = p_reason,
          rejected_at      = now(),
          updated_at       = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_rejected';

    WHEN 'cancel' THEN
      UPDATE competition_teams
      SET status     = 'cancelled',
          updated_at = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_cancelled';

    WHEN 'request_payment' THEN
      UPDATE competition_teams
      SET status         = 'pending_payment',
          payment_status = 'pending',
          updated_at     = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_approved';  -- reuse; no dedicated audit action for this

    WHEN 'confirm_payment' THEN
      UPDATE competition_teams
      SET payment_status = 'manually_confirmed',
          updated_at     = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_payment_confirmed';

    WHEN 'check_in' THEN
      UPDATE competition_teams
      SET checked_in = true,
          updated_at = now()
      WHERE id = p_team_id;
      v_audit_action := 'team_checked_in';

    ELSE
      RAISE EXCEPTION 'Unknown action: %', p_action;
  END CASE;

  INSERT INTO competition_audit_log
    (competition_id, changed_by, action, target_type, target_id, target_label, reason)
  VALUES
    (v_team.competition_id, auth.uid(), v_audit_action, 'team', p_team_id, v_team.name, p_reason);
END;
$$;

-- ─── submit_competition_result ────────────────────────────────────────────────
-- A judge (or captain) submits / updates a team result for a WOD.
CREATE OR REPLACE FUNCTION submit_competition_result(
  p_wod_id        UUID,
  p_team_id       UUID,
  p_raw_result    TEXT,
  p_score_type    TEXT,
  p_score_numeric NUMERIC,
  p_notes         TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id    UUID;
  v_competition  UUID;
BEGIN
  SELECT competition_id INTO v_competition FROM competition_wods WHERE id = p_wod_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'WOD not found';
  END IF;

  -- Must be a judge/head_judge in the competition OR the team's captain
  IF NOT (
    EXISTS (
      SELECT 1 FROM competition_roles
      WHERE competition_id = v_competition
        AND user_id = auth.uid()
        AND role IN ('judge','head_judge')
    )
    OR EXISTS (
      SELECT 1 FROM competition_teams
      WHERE id = p_team_id
        AND captain_user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Permission denied: must be a judge or the team captain';
  END IF;

  INSERT INTO competition_results
    (competition_id, wod_id, team_id, submitted_by, raw_result, score_type, score_numeric, notes, status)
  VALUES
    (v_competition, p_wod_id, p_team_id, auth.uid(), p_raw_result, p_score_type, p_score_numeric, p_notes, 'submitted')
  ON CONFLICT (wod_id, team_id) DO UPDATE
    SET raw_result    = EXCLUDED.raw_result,
        score_type    = EXCLUDED.score_type,
        score_numeric = EXCLUDED.score_numeric,
        notes         = EXCLUDED.notes,
        submitted_by  = EXCLUDED.submitted_by,
        submitted_at  = now(),
        status        = 'submitted'   -- reset to submitted on update
  RETURNING id INTO v_result_id;

  RETURN v_result_id;
END;
$$;

-- ─── override_competition_result ──────────────────────────────────────────────
-- Head judge corrects a result and logs the change.
CREATE OR REPLACE FUNCTION override_competition_result(
  p_result_id     UUID,
  p_raw_result    TEXT,
  p_score_numeric NUMERIC,
  p_reason        TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result    competition_results%ROWTYPE;
  v_old_raw   TEXT;
BEGIN
  SELECT * INTO v_result FROM competition_results WHERE id = p_result_id;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Result not found';
  END IF;

  IF NOT (is_competition_head_judge(v_result.competition_id) OR is_global_admin()) THEN
    RAISE EXCEPTION 'Only the head judge or an admin can override results';
  END IF;

  v_old_raw := v_result.raw_result;

  UPDATE competition_results
  SET raw_result    = p_raw_result,
      score_numeric = p_score_numeric,
      reviewed_at   = now(),
      status        = 'reviewed'
  WHERE id = p_result_id;

  INSERT INTO competition_audit_log
    (competition_id, changed_by, action, target_type, target_id, from_value, to_value, reason)
  VALUES
    (v_result.competition_id, auth.uid(), 'result_override', 'result', p_result_id,
     v_old_raw, p_raw_result, p_reason);
END;
$$;

-- ─── publish_wod_results ─────────────────────────────────────────────────────
-- Publishes all submitted/reviewed results for a WOD and marks the WOD published.
-- Returns the count of results published.
CREATE OR REPLACE FUNCTION publish_wod_results(
  p_wod_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_competition UUID;
  v_wod_name    TEXT;
  v_count       INT;
BEGIN
  SELECT competition_id, name INTO v_competition, v_wod_name
  FROM competition_wods WHERE id = p_wod_id;

  IF v_competition IS NULL THEN
    RAISE EXCEPTION 'WOD not found';
  END IF;

  IF NOT (is_competition_head_judge(v_competition) OR is_global_admin()) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE competition_results
  SET status       = 'published',
      published_at = now()
  WHERE wod_id = p_wod_id
    AND status IN ('submitted','reviewed');

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE competition_wods
  SET status = 'published'
  WHERE id = p_wod_id;

  INSERT INTO competition_audit_log
    (competition_id, changed_by, action, target_type, target_id, target_label, to_value)
  VALUES
    (v_competition, auth.uid(), 'wod_published', 'wod', p_wod_id, v_wod_name,
     v_count::TEXT || ' results published');

  RETURN v_count;
END;
$$;

-- ─── get_competition_leaderboard ─────────────────────────────────────────────
-- Returns team standings across all published WODs using the CF Games points scale.
--
-- Points array (position 1-based → CF_POINTS[position]):
--   [100,95,92,89,86,83,80,78,76,74,72,70,68,66,64,62,60,58,56,54,
--    52,50,48,46,44,42,40,38,36,34,32,30,28,26,24,22,20,18,16,14,
--    12,10,8,6,4,2,1,0]
CREATE OR REPLACE FUNCTION get_competition_leaderboard(
  p_competition_id UUID
)
RETURNS TABLE (
  team_id       UUID,
  team_name     TEXT,
  box           TEXT,
  total_points  INT,
  overall_rank  INT,
  per_wod       JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cf_points INT[] := ARRAY[
    100,95,92,89,86,83,80,78,76,74,
    72,70,68,66,64,62,60,58,56,54,
    52,50,48,46,44,42,40,38,36,34,
    32,30,28,26,24,22,20,18,16,14,
    12,10,8,6,4,2,1,0
  ];
BEGIN
  RETURN QUERY
  WITH published_wods AS (
    SELECT id AS wod_id, name AS wod_name, score_order
    FROM competition_wods
    WHERE competition_id = p_competition_id
      AND status = 'published'
  ),
  wod_rankings AS (
    -- Rank each team within each published WOD
    SELECT
      r.team_id,
      r.wod_id,
      r.raw_result,
      r.score_numeric,
      pw.wod_name,
      -- For 'asc' (time): lower score_numeric = better rank → use ASC
      -- For 'desc' (reps/weight): higher score_numeric = better rank → use DESC
      RANK() OVER (
        PARTITION BY r.wod_id
        ORDER BY
          CASE WHEN pw.score_order = 'asc'  THEN  r.score_numeric END ASC  NULLS LAST,
          CASE WHEN pw.score_order = 'desc' THEN  r.score_numeric END DESC NULLS LAST
      )::INT AS wod_rank,
      pw.score_order
    FROM competition_results r
    JOIN published_wods pw ON pw.wod_id = r.wod_id
    WHERE r.status = 'published'
  ),
  wod_points AS (
    SELECT
      team_id,
      wod_id,
      wod_name,
      raw_result,
      wod_rank,
      -- Clamp to array length; positions beyond the array length get 0 points
      COALESCE(v_cf_points[wod_rank], 0) AS points
    FROM wod_rankings
  ),
  team_totals AS (
    SELECT
      ct.id                              AS team_id,
      ct.name                            AS team_name,
      ct.box,
      COALESCE(SUM(wp.points), 0)::INT   AS total_points,
      -- Aggregate per-WOD detail as JSONB
      jsonb_object_agg(
        wp.wod_id::TEXT,
        jsonb_build_object(
          'wod_name',   wp.wod_name,
          'position',   wp.wod_rank,
          'points',     wp.points,
          'raw_result', wp.raw_result
        )
      ) FILTER (WHERE wp.wod_id IS NOT NULL) AS per_wod
    FROM competition_teams ct
    LEFT JOIN wod_points wp ON wp.team_id = ct.id
    WHERE ct.competition_id = p_competition_id
      AND ct.status = 'approved'
    GROUP BY ct.id, ct.name, ct.box
  )
  SELECT
    tt.team_id,
    tt.team_name,
    tt.box,
    tt.total_points,
    RANK() OVER (ORDER BY tt.total_points DESC)::INT AS overall_rank,
    COALESCE(tt.per_wod, '{}'::JSONB)
  FROM team_totals tt
  ORDER BY tt.total_points DESC;
END;
$$;

-- ─── search_athletes_for_invite ───────────────────────────────────────────────
-- Bypasses profiles RLS to allow searching for athletes to invite.
-- Minimum 2 characters to prevent full-table scans.
CREATE OR REPLACE FUNCTION search_athletes_for_invite(
  p_query TEXT
)
RETURNS TABLE (
  user_id   UUID,
  username  TEXT,
  full_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.name AS full_name
  FROM profiles p
  WHERE length(trim(p_query)) >= 2
    AND (
      p.username ILIKE '%' || trim(p_query) || '%'
      OR p.name   ILIKE '%' || trim(p_query) || '%'
    )
  LIMIT 10;
$$;

-- ─── get_profiles_public ─────────────────────────────────────────────────────
-- Bypasses profiles RLS to resolve a list of user IDs to display names.
CREATE OR REPLACE FUNCTION get_profiles_public(
  p_user_ids UUID[]
)
RETURNS TABLE (
  user_id   UUID,
  username  TEXT,
  full_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.name AS full_name
  FROM profiles p
  WHERE p.user_id = ANY(p_user_ids);
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────

-- Tables: anon gets SELECT only on publicly-visible tables; authenticated gets SELECT on all.
GRANT SELECT ON competitions              TO anon;
GRANT SELECT ON competition_wods          TO anon;
GRANT SELECT ON competition_results       TO anon;

GRANT SELECT ON competitions              TO authenticated;
GRANT SELECT ON competition_wods          TO authenticated;
GRANT SELECT ON competition_teams         TO authenticated;
GRANT SELECT ON competition_team_members  TO authenticated;
GRANT SELECT ON competition_roles         TO authenticated;
GRANT SELECT ON competition_judge_invites TO authenticated;
GRANT SELECT ON competition_results       TO authenticated;
GRANT SELECT ON competition_audit_log     TO authenticated;

-- RPCs
GRANT EXECUTE ON FUNCTION create_competition_team(UUID, TEXT, TEXT)                 TO authenticated;
GRANT EXECUTE ON FUNCTION invite_team_member(UUID, UUID, TEXT)                      TO authenticated;
GRANT EXECUTE ON FUNCTION respond_team_invite(UUID, BOOL)                           TO authenticated;
GRANT EXECUTE ON FUNCTION invite_judge_by_username(UUID, TEXT)                      TO authenticated;
GRANT EXECUTE ON FUNCTION accept_judge_invite(UUID)                                 TO authenticated;
GRANT EXECUTE ON FUNCTION manage_team(UUID, TEXT, TEXT)                             TO authenticated;
GRANT EXECUTE ON FUNCTION submit_competition_result(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION override_competition_result(UUID, TEXT, NUMERIC, TEXT)    TO authenticated;
GRANT EXECUTE ON FUNCTION publish_wod_results(UUID)                                 TO authenticated;
GRANT EXECUTE ON FUNCTION get_competition_leaderboard(UUID)                         TO authenticated;
GRANT EXECUTE ON FUNCTION get_competition_leaderboard(UUID)                         TO anon;
GRANT EXECUTE ON FUNCTION search_athletes_for_invite(TEXT)                          TO authenticated;
GRANT EXECUTE ON FUNCTION get_profiles_public(UUID[])                               TO authenticated;
GRANT EXECUTE ON FUNCTION is_global_admin()                                         TO authenticated;
GRANT EXECUTE ON FUNCTION is_competition_head_judge(UUID)                           TO authenticated;
