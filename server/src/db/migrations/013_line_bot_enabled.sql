-- LINEチャットボット有効化フラグを追加
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS line_bot_enabled BOOLEAN DEFAULT false;
