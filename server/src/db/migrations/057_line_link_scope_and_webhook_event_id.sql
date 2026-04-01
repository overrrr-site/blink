ALTER TABLE line_link_codes
  ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE;

UPDATE line_link_codes llc
SET owner_id = o.id,
    store_id = o.store_id
FROM owners o
WHERE llc.owner_id IS NULL
  AND llc.store_id IS NULL
  AND llc.phone = o.phone
  AND o.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM owners o2
    WHERE o2.phone = llc.phone
      AND o2.deleted_at IS NULL
      AND o2.id <> o.id
  );

CREATE INDEX IF NOT EXISTS idx_line_link_codes_owner_line ON line_link_codes(owner_id, line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_link_codes_store_line ON line_link_codes(store_id, line_user_id);

ALTER TABLE billing_webhook_events
  ADD COLUMN IF NOT EXISTS event_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_webhook_events_event_id_unique
  ON billing_webhook_events(event_id)
  WHERE event_id IS NOT NULL;
