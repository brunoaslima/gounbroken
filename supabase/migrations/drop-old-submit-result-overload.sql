-- Drop the old overload of submit_competition_result that takes p_competition_id.
-- This overload calls parse_score_numeric() which no longer exists and causes
-- PostgREST ambiguity when resolving the RPC from the frontend.
-- The correct version (p_wod_id, p_team_id, p_raw_result, p_score_type, p_score_numeric, p_notes)
-- was deployed in fix-submit-result-security.sql and must remain.
DROP FUNCTION IF EXISTS submit_competition_result(uuid, uuid, uuid, text, text, text);
