ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS ai_assistant_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS ai_store_data_contribution BOOLEAN DEFAULT TRUE;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS ai_service_improvement BOOLEAN DEFAULT FALSE;
