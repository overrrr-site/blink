-- Auto share setting for record notifications
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS auto_share_record BOOLEAN DEFAULT false;

-- Pre-visit inputs: service-specific data
ALTER TABLE pre_visit_inputs
  ADD COLUMN IF NOT EXISTS service_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS grooming_data JSONB,
  ADD COLUMN IF NOT EXISTS hotel_data JSONB;

-- Backfill service_type from reservations when missing
UPDATE pre_visit_inputs pvi
SET service_type = r.service_type
FROM reservations r
WHERE pvi.reservation_id = r.id
  AND pvi.service_type IS NULL;
