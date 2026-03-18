-- 046_rls_security_ux_and_clarity.sql
-- Supabaseセキュリティリンターで検出されたUX分析・Clarity関連テーブルのRLS未設定を修正
--
-- このアプリはバックエンドAPIゲートウェイパターンを採用しており、
-- フロントエンドからDBへの直接アクセスは行わない。
-- サーバーはservice_role keyまたは直接DB接続を使用するため、
-- anon/authenticated のPostgREST直接アクセスのみを明示的に拒否する。

-- ============================================================
-- 1. 追加テーブルにRLSを有効化
-- ============================================================
ALTER TABLE clarity_export_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_report_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ux_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. 直接アクセス拒否ポリシーを作成
-- ============================================================
DROP POLICY IF EXISTS "Deny all direct access" ON clarity_export_snapshots;
DROP POLICY IF EXISTS "Deny all direct access" ON ux_report_jobs;
DROP POLICY IF EXISTS "Deny all direct access" ON ux_events;

CREATE POLICY "Deny all direct access" ON clarity_export_snapshots FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON ux_report_jobs FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON ux_events FOR ALL USING (false);
