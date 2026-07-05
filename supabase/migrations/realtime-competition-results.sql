-- Enable Realtime for competition_results.
-- REPLICA IDENTITY FULL is required so Supabase Realtime can evaluate RLS
-- policies before broadcasting change events to subscribers.
ALTER TABLE competition_results REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE competition_results;
