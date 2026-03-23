-- 056: ガイドステップの再構成
-- view_dashboard（即完了で無意味）と setup_training（プリセット導入で不要）を削除
-- LINE設定をコア機能の後に移動（離脱防止）

-- 不要ステップを削除
DELETE FROM trial_guide_progress WHERE step_key IN ('view_dashboard', 'setup_training');

-- 新しい順序に更新（後ろから順に）
UPDATE trial_guide_progress SET step_number = 7 WHERE step_key = 'check_liff_app';
UPDATE trial_guide_progress SET step_number = 6 WHERE step_key = 'send_line_notification';
UPDATE trial_guide_progress SET step_number = 5 WHERE step_key = 'write_internal_notes';
UPDATE trial_guide_progress SET step_number = 4 WHERE step_key = 'link_line_account';
UPDATE trial_guide_progress SET step_number = 3 WHERE step_key = 'write_record';
UPDATE trial_guide_progress SET step_number = 2 WHERE step_key = 'create_reservation';
UPDATE trial_guide_progress SET step_number = 1 WHERE step_key = 'register_customer';

-- register_customer を自動アンロック（未アンロックの場合）
UPDATE trial_guide_progress
SET unlocked_at = COALESCE(unlocked_at, NOW())
WHERE step_key = 'register_customer';
