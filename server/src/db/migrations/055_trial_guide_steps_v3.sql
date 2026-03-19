-- 055_trial_guide_steps_v3.sql
-- トレーニング設定と内部メモのガイドステップを追加（7→9ステップ）

-- 既存ステップの番号を更新（後ろから順番に）
UPDATE trial_guide_progress SET step_number = 9 WHERE step_key = 'check_liff_app';
UPDATE trial_guide_progress SET step_number = 8 WHERE step_key = 'send_line_notification';
UPDATE trial_guide_progress SET step_number = 7 WHERE step_key = 'write_internal_notes'; -- 既に存在する場合
UPDATE trial_guide_progress SET step_number = 6 WHERE step_key = 'write_record';
UPDATE trial_guide_progress SET step_number = 5 WHERE step_key = 'setup_training'; -- 既に存在する場合

-- 新ステップ setup_training (5) を追加（既存アカウント向け）
INSERT INTO trial_guide_progress (store_id, step_number, step_key)
SELECT DISTINCT store_id, 5, 'setup_training'
FROM trial_guide_progress
WHERE NOT EXISTS (
    SELECT 1 FROM trial_guide_progress tgp2
    WHERE tgp2.store_id = trial_guide_progress.store_id
    AND tgp2.step_key = 'setup_training'
);

-- 新ステップ write_internal_notes (7) を追加（既存アカウント向け）
INSERT INTO trial_guide_progress (store_id, step_number, step_key)
SELECT DISTINCT store_id, 7, 'write_internal_notes'
FROM trial_guide_progress
WHERE NOT EXISTS (
    SELECT 1 FROM trial_guide_progress tgp2
    WHERE tgp2.store_id = trial_guide_progress.store_id
    AND tgp2.step_key = 'write_internal_notes'
);
