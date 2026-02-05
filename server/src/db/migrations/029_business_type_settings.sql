-- 業種別設定カラムをstore_settingsに追加

-- トリミング設定
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS grooming_default_duration INTEGER DEFAULT 60;
COMMENT ON COLUMN store_settings.grooming_default_duration IS 'トリミングのデフォルト施術時間（分）';

-- ホテル設定
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hotel_room_count INTEGER DEFAULT 10;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hotel_checkin_time TIME DEFAULT '10:00';
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS hotel_checkout_time TIME DEFAULT '18:00';

COMMENT ON COLUMN store_settings.hotel_room_count IS 'ホテルの部屋/ケージ数';
COMMENT ON COLUMN store_settings.hotel_checkin_time IS 'ホテルのデフォルトチェックイン時間';
COMMENT ON COLUMN store_settings.hotel_checkout_time IS 'ホテルのデフォルトチェックアウト時間';

-- 施術メニューマスタテーブル（トリミング向け）
CREATE TABLE IF NOT EXISTS grooming_menu_masters (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  menu_name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  duration_minutes INTEGER DEFAULT 30,
  dog_size VARCHAR(20) CHECK (dog_size IN ('小型', '中型', '大型', '全サイズ')),
  display_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grooming_menu_masters_store_id ON grooming_menu_masters(store_id);
COMMENT ON TABLE grooming_menu_masters IS 'トリミング施術メニューマスタ';

-- ホテル料金マスタテーブル
CREATE TABLE IF NOT EXISTS hotel_price_masters (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  dog_size VARCHAR(20) NOT NULL CHECK (dog_size IN ('小型', '中型', '大型')),
  price_per_night DECIMAL(10,2) NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, dog_size)
);

CREATE INDEX IF NOT EXISTS idx_hotel_price_masters_store_id ON hotel_price_masters(store_id);
COMMENT ON TABLE hotel_price_masters IS 'ホテル1泊料金マスタ（サイズ別）';
