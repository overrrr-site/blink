-- 042_daycare_data_migration.sql
-- Add daycare_data JSONB column
ALTER TABLE pre_visit_inputs
  ADD COLUMN IF NOT EXISTS daycare_data JSONB;

-- Backfill existing daycare rows
UPDATE pre_visit_inputs
SET daycare_data = jsonb_build_object(
  'pickup_time', '17:00',
  'energy', 'good',
  'appetite', CASE
    WHEN breakfast_status IN ('完食', '少し残した') THEN 'good'
    WHEN breakfast_status IN ('半分以下', '食べていない') THEN 'poor'
    ELSE 'good'
  END,
  'poop', 'normal',
  'pee', 'normal',
  'vomiting', false,
  'itching', false,
  'medication', false,
  'notes', COALESCE(health_status, '') || CASE WHEN health_status IS NOT NULL AND notes IS NOT NULL THEN E'\n' ELSE '' END || COALESCE(notes, '')
)
WHERE COALESCE(service_type, 'daycare') = 'daycare'
  AND daycare_data IS NULL;

-- Drop old columns
ALTER TABLE pre_visit_inputs
  DROP COLUMN IF EXISTS morning_urination,
  DROP COLUMN IF EXISTS morning_defecation,
  DROP COLUMN IF EXISTS afternoon_urination,
  DROP COLUMN IF EXISTS afternoon_defecation,
  DROP COLUMN IF EXISTS breakfast_status,
  DROP COLUMN IF EXISTS health_status,
  DROP COLUMN IF EXISTS notes,
  DROP COLUMN IF EXISTS meal_data;
