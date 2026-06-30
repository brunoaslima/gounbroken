-- Add height column to profiles
ALTER TABLE profiles ADD COLUMN height_cm numeric(5,1) CHECK (height_cm > 0);
