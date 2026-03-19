-- journal_notification カラムを record_notification にリネーム
ALTER TABLE IF EXISTS notification_settings
  RENAME COLUMN journal_notification TO record_notification;
