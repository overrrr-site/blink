-- 閲覧ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  store_id INTEGER REFERENCES stores(id) ON DELETE CASCADE,
  staff_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete'
  resource_type VARCHAR(50) NOT NULL, -- 'owner', 'dog', 'reservation', 'journal'
  resource_id INTEGER NOT NULL,
  resource_name VARCHAR(255), -- 表示用のリソース名
  details JSONB, -- 追加の詳細情報（変更内容など）
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_audit_logs_store_id ON audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 論理削除用のカラム追加
ALTER TABLE owners ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE journals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- 論理削除インデックスの作成
CREATE INDEX IF NOT EXISTS idx_owners_deleted_at ON owners(deleted_at);
CREATE INDEX IF NOT EXISTS idx_dogs_deleted_at ON dogs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_reservations_deleted_at ON reservations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_journals_deleted_at ON journals(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts(deleted_at);

-- dog_healthテーブルにflea_tick_dateカラムを追加
ALTER TABLE dog_health ADD COLUMN IF NOT EXISTS flea_tick_date DATE;
