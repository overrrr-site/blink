-- 契約の期間制対応（ベータレポート対応 E-1, E-2）
-- 例: 営業日20日以内で8回までという「期限つき回数制」を表現する
-- 既存 contracts.valid_until は引き続き「契約終了日」として利用

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS period_type TEXT NOT NULL DEFAULT 'monthly',
    -- 'monthly': 月謝制（カレンダー月でリセット）
    -- 'business_days_window': 期間つき回数制（period_days 営業日以内で period_count_limit 回まで）
  ADD COLUMN IF NOT EXISTS period_days INTEGER,
    -- business_days_window 時の対象営業日数（例: 20）
  ADD COLUMN IF NOT EXISTS period_count_limit INTEGER;
    -- business_days_window 時の許可回数（例: 8）

COMMENT ON COLUMN contracts.period_type IS '期間タイプ: monthly | business_days_window';
COMMENT ON COLUMN contracts.period_days IS 'business_days_window 時の対象営業日数';
COMMENT ON COLUMN contracts.period_count_limit IS 'business_days_window 時の許可回数';

-- 期日1週間前通知用：通知済みフラグ（同じ契約に対して何度も通知しない）
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS due_date_reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN contracts.due_date_reminder_sent_at IS '期日1週間前通知を送った日時';
