-- 犬プロフィール拡張（ベータレポート対応 B群: B-1〜B-8）
-- B-1 フリガナ
-- B-3 鑑札番号（マイクロチップは既存 microchip_number を維持）
-- B-6 ノミ・ダニ予防チェック（既存 flea_tick_date は後方互換で維持）
-- B-7 フィラリア予防チェック＋日付
-- B-8 おなか/足の特徴

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS name_kana TEXT,
  ADD COLUMN IF NOT EXISTS dog_tag_number TEXT;

CREATE INDEX IF NOT EXISTS idx_dogs_name_kana
  ON dogs(owner_id, name_kana)
  WHERE deleted_at IS NULL;

-- 健康情報は dog_health テーブルに追加
ALTER TABLE dog_health
  ADD COLUMN IF NOT EXISTS flea_tick_prevention BOOLEAN,
  ADD COLUMN IF NOT EXISTS heartworm_prevention BOOLEAN,
  ADD COLUMN IF NOT EXISTS heartworm_prevention_date DATE,
  ADD COLUMN IF NOT EXISTS easily_upset_stomach BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS easily_hurts_legs BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN dogs.name_kana IS 'フリガナ（検索対象）';
COMMENT ON COLUMN dogs.dog_tag_number IS '鑑札番号';
COMMENT ON COLUMN dog_health.flea_tick_prevention IS 'ノミ・ダニ予防: している/していない（日付は flea_tick_date 併用）';
COMMENT ON COLUMN dog_health.heartworm_prevention IS 'フィラリア予防: している/していない';
COMMENT ON COLUMN dog_health.heartworm_prevention_date IS 'フィラリア予防接種日（任意）';
COMMENT ON COLUMN dog_health.easily_upset_stomach IS 'おなかを壊しやすい';
COMMENT ON COLUMN dog_health.easily_hurts_legs IS '足を痛めやすい';
