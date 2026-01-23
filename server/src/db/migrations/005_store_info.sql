-- 店舗基本情報の拡張（営業時間・定休日）
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_hours JSONB;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS closed_days JSONB;

-- コメント追加
COMMENT ON COLUMN stores.business_hours IS '営業時間（JSON形式: {"monday": {"open": "09:00", "close": "18:00"}, ...}）';
COMMENT ON COLUMN stores.closed_days IS '定休日（JSON配列形式: ["sunday", "monday"]）';
