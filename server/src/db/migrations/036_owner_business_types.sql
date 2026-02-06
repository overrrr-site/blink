-- カラム追加
ALTER TABLE owners ADD COLUMN IF NOT EXISTS business_types TEXT[] DEFAULT NULL;

-- 既存顧客を幼稚園にフラグ設定
UPDATE owners SET business_types = ARRAY['daycare'] WHERE business_types IS NULL AND deleted_at IS NULL;
