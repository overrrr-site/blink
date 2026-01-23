-- 振替チケットテーブル
CREATE TABLE IF NOT EXISTS makeup_tickets (
  id SERIAL PRIMARY KEY,
  dog_id INTEGER REFERENCES dogs(id) ON DELETE CASCADE,
  contract_id INTEGER REFERENCES contracts(id) ON DELETE SET NULL,
  issued_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  used_at TIMESTAMP,
  reservation_id INTEGER REFERENCES reservations(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- キャンセルポリシーテーブル
CREATE TABLE IF NOT EXISTS cancel_policies (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  three_days_before_rate DECIMAL(5,2) DEFAULT 30.00,
  two_days_before_rate DECIMAL(5,2) DEFAULT 30.00,
  one_day_before_rate DECIMAL(5,2) DEFAULT 30.00,
  same_day_rate DECIMAL(5,2) DEFAULT 50.00,
  no_show_rate DECIMAL(5,2) DEFAULT 100.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_makeup_tickets_dog_id ON makeup_tickets(dog_id);
CREATE INDEX IF NOT EXISTS idx_makeup_tickets_contract_id ON makeup_tickets(contract_id);
CREATE INDEX IF NOT EXISTS idx_makeup_tickets_valid_until ON makeup_tickets(valid_until);
CREATE INDEX IF NOT EXISTS idx_cancel_policies_store_id ON cancel_policies(store_id);
