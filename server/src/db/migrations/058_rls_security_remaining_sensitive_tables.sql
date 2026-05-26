-- 058_rls_security_remaining_sensitive_tables.sql
-- 後続マイグレーションで追加された機微情報テーブルのRLS未設定を補完
--
-- Blink はバックエンド API 経由でのみ機微データへアクセスする設計のため、
-- PostgREST からの anon / authenticated 直接アクセスは明示的に拒否する。
--
-- 各環境でテーブル適用状況が異なる可能性があるため、存在チェック付きで安全に実行する。

DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'billing_webhook_events',
    'trial_line_links',
    'trial_guide_progress',
    'ai_intake_sessions',
    'ai_intake_messages'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Deny all direct access" ON %I', t);
      EXECUTE format('CREATE POLICY "Deny all direct access" ON %I FOR ALL USING (false)', t);
    END IF;
  END LOOP;
END $$;
