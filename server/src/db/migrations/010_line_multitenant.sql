-- 店舗にLINE認証情報カラムを追加（マルチテナント対応）
-- 各店舗が独自のLINE公式アカウントを使用できるようにする

ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_channel_id VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_channel_secret VARCHAR(255);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS line_channel_access_token TEXT;

-- コメント追加
COMMENT ON COLUMN stores.line_channel_id IS 'LINE Messaging APIのチャネルID';
COMMENT ON COLUMN stores.line_channel_secret IS 'LINE Messaging APIのチャネルシークレット';
COMMENT ON COLUMN stores.line_channel_access_token IS 'LINE Messaging APIのチャネルアクセストークン';
