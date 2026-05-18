-- 飼い主テーブル拡張（ベータレポート対応 A群）
-- A-1: 会員/非会員フラグ
-- A-2: 会員番号
-- A-3: 郵便番号（住所自動入力で利用）
-- A-4: 生年月日

ALTER TABLE owners
  ADD COLUMN IF NOT EXISTS is_member BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS member_number TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 会員番号は店舗内ユニーク（NULL同士は競合させない部分インデックス）
CREATE UNIQUE INDEX IF NOT EXISTS idx_owners_store_member_number_unique
  ON owners(store_id, member_number)
  WHERE member_number IS NOT NULL;

COMMENT ON COLUMN owners.is_member IS '会員フラグ（false=非会員）';
COMMENT ON COLUMN owners.member_number IS '店舗内ユニークな会員番号';
COMMENT ON COLUMN owners.postal_code IS '郵便番号（ハイフン抜き7桁推奨）';
COMMENT ON COLUMN owners.birth_date IS '生年月日';
