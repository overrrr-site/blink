-- 048_add_trial_mode_to_stores.sql
-- トライアルモード対応: storesテーブルにトライアル関連カラムを追加

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS is_trial BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_store_code VARCHAR(20) UNIQUE;

COMMENT ON COLUMN stores.is_trial IS 'トライアルモードかどうか';
COMMENT ON COLUMN stores.trial_started_at IS 'トライアル開始日時';
COMMENT ON COLUMN stores.trial_expires_at IS 'トライアル期限（デフォルト14日）';
COMMENT ON COLUMN stores.converted_at IS '本契約に切り替えた日時（NULLならまだ）';
COMMENT ON COLUMN stores.trial_store_code IS 'トライアル中の店舗識別コード（LINE友だち追加時の紐付けに使用）';

-- 既存店舗は本契約扱いにする（本番実行時は事前に対象店舗を確認すること）
-- 既存ベータ店舗を全削除する場合は、このマイグレーション前に手動で実行
UPDATE stores SET is_trial = false, trial_started_at = NULL, trial_expires_at = NULL WHERE is_trial = true;
