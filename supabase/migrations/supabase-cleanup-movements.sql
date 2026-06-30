-- Step 1: Delete newly-seeded duplicates that have no scores
-- (safe: only deletes rows with zero score records)
DELETE FROM movements
WHERE name IN ('Hang Squat Snatch', 'Hang Squat Clean', 'Clean and Jerk', 'Shoulder Press (Strict)')
  AND id NOT IN (SELECT DISTINCT movement_id FROM scores);

-- Step 2: Rename old movements to new canonical names
UPDATE movements SET name = 'Hang Squat Snatch'      WHERE name = 'Hang Snatch';
UPDATE movements SET name = 'Hang Squat Clean'       WHERE name = 'Hang Clean';
UPDATE movements SET name = 'Clean and Jerk'         WHERE name = 'Clean & Jerk';
UPDATE movements SET name = 'Shoulder Press (Strict)' WHERE name = 'Strict Press';

-- Step 3: Delete movements no longer in the preset list (only if no scores)
DELETE FROM movements
WHERE name IN ('Jerk', 'Romanian Deadlift')
  AND id NOT IN (SELECT DISTINCT movement_id FROM scores);
