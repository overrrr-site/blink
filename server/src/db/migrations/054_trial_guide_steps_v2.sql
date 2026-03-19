-- 054: トライアルガイドステップ v2
-- 5→7ステップに拡張（link_line_account, check_liff_app を追加）
-- 既存ステップの step_number を再マッピング

-- 1. 既存ステップの step_number をシフト（逆順で更新して衝突を避ける）
UPDATE trial_guide_progress SET step_number = 6 WHERE step_key = 'send_line_notification';
UPDATE trial_guide_progress SET step_number = 5 WHERE step_key = 'write_record';
UPDATE trial_guide_progress SET step_number = 4 WHERE step_key = 'create_reservation';

-- 2. 新ステップ3（link_line_account）を追加
INSERT INTO trial_guide_progress (store_id, step_number, step_key)
SELECT store_id, 3, 'link_line_account'
FROM trial_guide_progress
WHERE step_key = 'view_dashboard'
  AND NOT EXISTS (
    SELECT 1 FROM trial_guide_progress tgp2
    WHERE tgp2.store_id = trial_guide_progress.store_id
      AND tgp2.step_key = 'link_line_account'
  );

-- 3. 新ステップ7（check_liff_app）を追加
INSERT INTO trial_guide_progress (store_id, step_number, step_key)
SELECT store_id, 7, 'check_liff_app'
FROM trial_guide_progress
WHERE step_key = 'view_dashboard'
  AND NOT EXISTS (
    SELECT 1 FROM trial_guide_progress tgp2
    WHERE tgp2.store_id = trial_guide_progress.store_id
      AND tgp2.step_key = 'check_liff_app'
  );

-- 4. register_customer が完了済みなら link_line_account をアンロック
UPDATE trial_guide_progress
SET unlocked_at = NOW()
WHERE step_key = 'link_line_account'
  AND unlocked_at IS NULL
  AND store_id IN (
    SELECT store_id FROM trial_guide_progress
    WHERE step_key = 'register_customer' AND completed_at IS NOT NULL
  );

-- 5. send_line_notification が完了済みなら check_liff_app をアンロック
UPDATE trial_guide_progress
SET unlocked_at = NOW()
WHERE step_key = 'check_liff_app'
  AND unlocked_at IS NULL
  AND store_id IN (
    SELECT store_id FROM trial_guide_progress
    WHERE step_key = 'send_line_notification' AND completed_at IS NOT NULL
  );
