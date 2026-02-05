-- 店舗テーブルに業種情報を追加
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_types TEXT[] DEFAULT ARRAY['daycare'];
ALTER TABLE stores ADD COLUMN IF NOT EXISTS primary_business_type TEXT DEFAULT 'daycare';

-- 制約追加（既存の場合はスキップ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_primary_business_type'
  ) THEN
    ALTER TABLE stores ADD CONSTRAINT valid_primary_business_type
      CHECK (primary_business_type IN ('grooming', 'daycare', 'hotel'));
  END IF;
END $$;
