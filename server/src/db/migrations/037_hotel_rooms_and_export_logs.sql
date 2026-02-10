-- ホテル部屋マスタ
CREATE TABLE IF NOT EXISTS hotel_rooms (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  room_name VARCHAR(100) NOT NULL,
  room_size VARCHAR(20) NOT NULL DEFAULT '小型' CHECK (room_size IN ('小型', '中型', '大型')),
  capacity INTEGER NOT NULL DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_rooms_store_room_name
  ON hotel_rooms(store_id, room_name);

CREATE INDEX IF NOT EXISTS idx_hotel_rooms_store_enabled_order
  ON hotel_rooms(store_id, enabled, display_order, id);

-- 予約に部屋割り情報を追加
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS room_id INTEGER REFERENCES hotel_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_store_room_date
  ON reservations(store_id, room_id, reservation_date, reservation_time);

-- 出力監査ログ
CREATE TABLE IF NOT EXISTS export_logs (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  export_type VARCHAR(30) NOT NULL CHECK (export_type IN ('records', 'reservations')),
  output_format VARCHAR(20) NOT NULL CHECK (output_format IN ('csv', 'print')),
  filters JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_export_logs_store_created
  ON export_logs(store_id, created_at DESC);
