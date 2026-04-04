-- 058_rls_security_remaining_sensitive_tables.sql
-- 後続マイグレーションで追加された機微情報テーブルのRLS未設定を補完
--
-- Blink はバックエンド API 経由でのみ機微データへアクセスする設計のため、
-- PostgREST からの anon / authenticated 直接アクセスは明示的に拒否する。

ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_line_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_guide_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intake_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_intake_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny all direct access" ON billing_webhook_events;
DROP POLICY IF EXISTS "Deny all direct access" ON trial_line_links;
DROP POLICY IF EXISTS "Deny all direct access" ON trial_guide_progress;
DROP POLICY IF EXISTS "Deny all direct access" ON ai_intake_sessions;
DROP POLICY IF EXISTS "Deny all direct access" ON ai_intake_messages;

CREATE POLICY "Deny all direct access" ON billing_webhook_events FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON trial_line_links FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON trial_guide_progress FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON ai_intake_sessions FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON ai_intake_messages FOR ALL USING (false);
