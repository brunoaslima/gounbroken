-- Step 1: Remove exact duplicate movements (keep oldest row per user+name)
DELETE FROM movements
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (PARTITION BY user_id, name ORDER BY created_at ASC) AS rn
    FROM movements
  ) t
  WHERE rn > 1
);

-- Step 2: Rename old movement names to new canonical names
UPDATE movements SET name = 'Hang Squat Snatch'       WHERE name = 'Hang Snatch';
UPDATE movements SET name = 'Hang Squat Clean'        WHERE name = 'Hang Clean';
UPDATE movements SET name = 'Clean and Jerk'          WHERE name = 'Clean & Jerk';
UPDATE movements SET name = 'Shoulder Press (Strict)' WHERE name = 'Strict Press';

-- Step 3: Remove old movements no longer in preset list (only if no scores)
DELETE FROM movements
WHERE name IN ('Jerk', 'Romanian Deadlift')
  AND id NOT IN (SELECT DISTINCT movement_id FROM scores);

-- Step 4: Add unique constraint to prevent duplicates forever
ALTER TABLE movements
  ADD CONSTRAINT movements_user_name_unique UNIQUE (user_id, name);
