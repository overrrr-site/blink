-- LINE ID紐付け用の確認コードテーブル
CREATE TABLE IF NOT EXISTS line_link_codes (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(6) NOT NULL,
  line_user_id VARCHAR(100) NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_line_link_codes_phone ON line_link_codes(phone);
CREATE INDEX IF NOT EXISTS idx_line_link_codes_line_user_id ON line_link_codes(line_user_id);
CREATE INDEX IF NOT EXISTS idx_line_link_codes_expires_at ON line_link_codes(expires_at);

-- 期限切れデータの自動削除用（定期的に実行することを推奨）
-- DELETE FROM line_link_codes WHERE expires_at < CURRENT_TIMESTAMP;
