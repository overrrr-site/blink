-- 049_create_trial_line_links.sql
-- トライアル中のLINEユーザーと店舗の紐付け管理

CREATE TABLE IF NOT EXISTS trial_line_links (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  line_user_id VARCHAR(100) NOT NULL,
  owner_id INTEGER REFERENCES owners(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, line_user_id)
);

CREATE INDEX IF NOT EXISTS idx_trial_line_links_line_user_id ON trial_line_links(line_user_id);
CREATE INDEX IF NOT EXISTS idx_trial_line_links_store_id ON trial_line_links(store_id);

COMMENT ON TABLE trial_line_links IS 'トライアル中のLINEユーザーと店舗の紐付け（本契約移行時に削除）';
COMMENT ON COLUMN trial_line_links.line_user_id IS 'LINE User ID';
COMMENT ON COLUMN trial_line_links.owner_id IS '紐付けられた飼い主（LIFF認証時に使用）';
