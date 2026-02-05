-- カルテテーブル（日誌の後継、3業種対応）
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  dog_id INTEGER NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,

  -- 業態
  record_type TEXT NOT NULL,
  record_date DATE NOT NULL,

  -- 業態固有データ（JSONB）
  grooming_data JSONB,
  daycare_data JSONB,
  hotel_data JSONB,

  -- 共通データ
  photos JSONB DEFAULT '{"regular": [], "concerns": []}',
  notes JSONB DEFAULT '{"internal_notes": null, "report_text": null}',
  condition JSONB,
  health_check JSONB,

  -- AI関連
  ai_generated_text TEXT,
  ai_suggestions JSONB,

  -- ステータス
  status TEXT DEFAULT 'draft',
  shared_at TIMESTAMP,

  -- メタ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,

  CONSTRAINT valid_record_type CHECK (record_type IN ('grooming', 'daycare', 'hotel')),
  CONSTRAINT valid_record_status CHECK (status IN ('draft', 'saved', 'shared'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_records_store_date ON records(store_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_records_dog ON records(dog_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_records_reservation ON records(reservation_id);
CREATE INDEX IF NOT EXISTS idx_records_status ON records(store_id, status);
