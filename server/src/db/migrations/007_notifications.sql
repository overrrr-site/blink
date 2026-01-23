-- 通知設定テーブル
CREATE TABLE IF NOT EXISTS notification_settings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  reminder_before_visit BOOLEAN DEFAULT true,
  reminder_before_visit_days INTEGER DEFAULT 1, -- 何日前に通知するか
  journal_notification BOOLEAN DEFAULT true,
  vaccine_alert BOOLEAN DEFAULT true,
  vaccine_alert_days INTEGER DEFAULT 14, -- 何日前に通知するか
  line_notification_enabled BOOLEAN DEFAULT false,
  email_notification_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知送信ログテーブル
CREATE TABLE IF NOT EXISTS notification_logs (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL, -- 'reminder', 'journal', 'vaccine_alert'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  sent_via VARCHAR(20), -- 'line', 'email', 'app'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notification_logs_store_id ON notification_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_owner_id ON notification_logs(owner_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
