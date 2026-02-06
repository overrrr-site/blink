-- 整合性チェック/補助インデックスの追加（追加のみ）

-- staff.assigned_business_types の値制約
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_assigned_business_types'
  ) THEN
    ALTER TABLE staff ADD CONSTRAINT valid_assigned_business_types
      CHECK (
        assigned_business_types IS NULL
        OR assigned_business_types <@ ARRAY['daycare', 'grooming', 'hotel']::text[]
      );
  END IF;
END $$;

-- records の参照・フィルタ向けインデックス
CREATE INDEX IF NOT EXISTS idx_records_store_type_date
  ON records(store_id, record_type, record_date DESC);

CREATE INDEX IF NOT EXISTS idx_records_staff_id
  ON records(staff_id);

-- ai_learning_data の値制約（テーブル存在時のみ）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'ai_learning_data'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'valid_ai_learning_data_type'
    ) THEN
      ALTER TABLE ai_learning_data ADD CONSTRAINT valid_ai_learning_data_type
        CHECK (data_type IN ('report_generation', 'photo_analysis', 'suggestion_feedback'));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'valid_ai_learning_data_record_type'
    ) THEN
      ALTER TABLE ai_learning_data ADD CONSTRAINT valid_ai_learning_data_record_type
        CHECK (record_type IS NULL OR record_type IN ('daycare', 'grooming', 'hotel'));
    END IF;
  END IF;
END $$;

-- staff の業種割り当て検索向けインデックス
CREATE INDEX IF NOT EXISTS idx_staff_assigned_business_types
  ON staff USING GIN (assigned_business_types);
