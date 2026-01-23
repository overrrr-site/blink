-- 多頭割引設定テーブル
CREATE TABLE IF NOT EXISTS multi_dog_discount_settings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  second_dog_discount DECIMAL(5,2) DEFAULT 5.00,
  third_dog_discount DECIMAL(5,2) DEFAULT 10.00,
  fourth_dog_discount DECIMAL(5,2) DEFAULT 15.00,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 予約に割引情報を追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS discount_rate DECIMAL(5,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS final_price DECIMAL(10,2);

-- 店舗設定テーブル（受入可能頭数など）
CREATE TABLE IF NOT EXISTS store_settings (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  max_capacity INTEGER DEFAULT 15,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コース・料金マスタテーブル
CREATE TABLE IF NOT EXISTS course_masters (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  course_name VARCHAR(100) NOT NULL,
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('月謝制', 'チケット制', '単発')),
  sessions INTEGER,
  price DECIMAL(10,2) NOT NULL,
  valid_days INTEGER,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- トレーニング項目マスタテーブル
CREATE TABLE IF NOT EXISTS training_item_masters (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  item_key VARCHAR(100) NOT NULL,
  item_label VARCHAR(100) NOT NULL,
  display_order INTEGER DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(store_id, item_key)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_multi_dog_discount_settings_store_id ON multi_dog_discount_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_store_settings_store_id ON store_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_course_masters_store_id ON course_masters(store_id);
CREATE INDEX IF NOT EXISTS idx_training_item_masters_store_id ON training_item_masters(store_id);
