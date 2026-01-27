-- 店舗からのお知らせテーブル
CREATE TABLE IF NOT EXISTS store_announcements (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_important BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_by INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_store_announcements_store ON store_announcements(store_id);
CREATE INDEX IF NOT EXISTS idx_store_announcements_period ON store_announcements(published_at, expires_at);
