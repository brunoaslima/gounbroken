-- Purge login_attempts older than 24 hours to prevent unbounded table growth
-- Runs hourly via pg_cron
SELECT cron.schedule(
  'purge-login-attempts',
  '0 * * * *',
  $$DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '24 hours'$$
);
