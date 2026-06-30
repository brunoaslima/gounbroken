-- Drop function that was previously only revoked — full removal prevents future re-grant accidents
DROP FUNCTION IF EXISTS get_email_by_username(text);
