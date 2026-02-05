-- 店舗のオンボーディング完了フラグを追加
-- 初期登録時に業態選択を必須とするため

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- 既存の店舗はオンボーディング済みとして設定
UPDATE stores SET onboarding_completed = TRUE WHERE onboarding_completed = FALSE;
