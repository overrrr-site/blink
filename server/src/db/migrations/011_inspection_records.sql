-- 点検状況記録台帳テーブル
CREATE TABLE IF NOT EXISTS inspection_records (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspection_time TIME,
  -- 飼養施設の点検
  cleaning_done BOOLEAN DEFAULT FALSE,        -- 清掃
  disinfection_done BOOLEAN DEFAULT FALSE,    -- 消毒
  maintenance_done BOOLEAN DEFAULT FALSE,     -- 保守点検
  -- 動物の点検
  animal_count_abnormal BOOLEAN DEFAULT FALSE,  -- 数の異常
  animal_state_abnormal BOOLEAN DEFAULT FALSE,  -- 状態の異常
  -- その他
  inspector_name VARCHAR(100),                -- 点検担当者氏名
  notes TEXT,                                 -- 備考
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, inspection_date)
);

-- 店舗設定の追加（第一種動物取扱業の種別）
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_types TEXT[];  -- ['販売', '保管', '訓練'] など

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_inspection_records_store_id ON inspection_records(store_id);
CREATE INDEX IF NOT EXISTS idx_inspection_records_inspection_date ON inspection_records(inspection_date);
CREATE INDEX IF NOT EXISTS idx_inspection_records_store_date ON inspection_records(store_id, inspection_date);
