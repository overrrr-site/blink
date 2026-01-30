-- 021_rls_security.sql
-- Supabaseセキュリティリンターで検出された16テーブルにRLSを有効化
-- + 既存11テーブルの USING(true) ポリシーを USING(false) に変更
--
-- このアプリはバックエンドAPIゲートウェイパターンを採用しており、
-- フロントエンドからDBへの直接アクセスは一切ない。
-- サーバーはservice_role keyを使用するためRLSをバイパスする。
-- したがって USING(false) でPostgREST経由のanon/authenticatedアクセスを完全にブロックする。

-- ============================================================
-- 1. 全16テーブルにRLSを有効化
-- ============================================================

-- 002_google_calendar.sql のテーブル
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservation_calendar_events ENABLE ROW LEVEL SECURITY;

-- 003_contracts_and_makeup_tickets.sql のテーブル
ALTER TABLE makeup_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE cancel_policies ENABLE ROW LEVEL SECURITY;

-- 004_multi_dog_discount_and_settings.sql のテーブル
ALTER TABLE multi_dog_discount_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_item_masters ENABLE ROW LEVEL SECURITY;

-- 006_audit_log_and_soft_delete.sql のテーブル
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 007_notifications.sql のテーブル
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 008_billing.sql のテーブル
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- 011_inspection_records.sql のテーブル
ALTER TABLE inspection_records ENABLE ROW LEVEL SECURITY;

-- 012_line_link_codes.sql のテーブル
ALTER TABLE line_link_codes ENABLE ROW LEVEL SECURITY;

-- 015_announcements.sql のテーブル
ALTER TABLE store_announcements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. 既存11テーブルの USING(true) ポリシーを削除し USING(false) に置換
--    service_role はRLSをバイパスするためバックエンドは影響を受けない。
--    anon/authenticatedからのPostgRESTアクセスは全てブロックされる。
-- ============================================================

DROP POLICY IF EXISTS "Enable all access for service role" ON staff;
DROP POLICY IF EXISTS "Enable all access for service role" ON stores;
DROP POLICY IF EXISTS "Enable all access for service role" ON staff_stores;
DROP POLICY IF EXISTS "Enable all access for service role" ON owners;
DROP POLICY IF EXISTS "Enable all access for service role" ON dogs;
DROP POLICY IF EXISTS "Enable all access for service role" ON dog_health;
DROP POLICY IF EXISTS "Enable all access for service role" ON dog_personality;
DROP POLICY IF EXISTS "Enable all access for service role" ON contracts;
DROP POLICY IF EXISTS "Enable all access for service role" ON reservations;
DROP POLICY IF EXISTS "Enable all access for service role" ON pre_visit_inputs;
DROP POLICY IF EXISTS "Enable all access for service role" ON journals;

-- 既存11テーブルに USING(false) ポリシーを再作成
CREATE POLICY "Deny all direct access" ON staff FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON stores FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON staff_stores FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON owners FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON dogs FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON dog_health FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON dog_personality FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON contracts FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON reservations FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON pre_visit_inputs FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON journals FOR ALL USING (false);

-- ============================================================
-- 3. 新規16テーブルにも USING(false) ポリシーを作成
-- ============================================================

CREATE POLICY "Deny all direct access" ON google_calendar_integrations FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON reservation_calendar_events FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON makeup_tickets FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON cancel_policies FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON multi_dog_discount_settings FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON store_settings FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON course_masters FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON training_item_masters FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON audit_logs FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON notification_settings FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON notification_logs FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON plans FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON billing_history FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON inspection_records FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON line_link_codes FOR ALL USING (false);
CREATE POLICY "Deny all direct access" ON store_announcements FOR ALL USING (false);
