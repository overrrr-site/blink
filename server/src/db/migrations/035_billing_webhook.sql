-- PAY.JP Webhook対応

-- billing_historyにfailure_reason追加
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Webhookイベントログ（デバッグ用）
CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
