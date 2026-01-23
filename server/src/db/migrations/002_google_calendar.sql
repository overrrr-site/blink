-- Googleカレンダー連携テーブル
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  calendar_id VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 予約とGoogleカレンダーイベントの関連テーブル
CREATE TABLE IF NOT EXISTS reservation_calendar_events (
  id SERIAL PRIMARY KEY,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE CASCADE UNIQUE,
  calendar_event_id VARCHAR(255) NOT NULL,
  calendar_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_google_calendar_integrations_store_id ON google_calendar_integrations(store_id);
CREATE INDEX IF NOT EXISTS idx_reservation_calendar_events_reservation_id ON reservation_calendar_events(reservation_id);
CREATE INDEX IF NOT EXISTS idx_reservation_calendar_events_calendar_event_id ON reservation_calendar_events(calendar_event_id);
