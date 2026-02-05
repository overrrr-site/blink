-- 予約テーブルにサービス種別情報を追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS service_type TEXT DEFAULT 'daycare';
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS service_details JSONB;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS end_datetime TIMESTAMP;

-- 制約追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_service_type'
  ) THEN
    ALTER TABLE reservations ADD CONSTRAINT valid_service_type
      CHECK (service_type IN ('grooming', 'daycare', 'hotel'));
  END IF;
END $$;
