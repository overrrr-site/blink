-- 本番環境用シードデータ
-- Supabase SQL Editorで実行してください

-- ============================================
-- 0. マイグレーション（auth_user_idカラムの追加）
-- ============================================

-- auth_user_idカラムを追加（存在しない場合のみ）
ALTER TABLE staff ADD COLUMN IF NOT EXISTS auth_user_id UUID;

-- インデックスを作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON staff(auth_user_id);

-- password_hashをNULL許容に変更（Supabase Authを使う場合は不要になるため）
ALTER TABLE staff ALTER COLUMN password_hash DROP NOT NULL;

-- ============================================
-- 1. 既存データのクリア
-- ============================================

-- 外部キー制約があるため、順序に注意
DELETE FROM journals;
DELETE FROM pre_visit_inputs;
DELETE FROM reservations;
DELETE FROM contracts;
DELETE FROM dog_personality;
DELETE FROM dog_health;
DELETE FROM dogs;
DELETE FROM owners;
DELETE FROM staff_stores;
DELETE FROM staff;
DELETE FROM stores;

-- ============================================
-- 2. 店舗データの作成
-- ============================================

INSERT INTO stores (id, name, address, phone, created_at, updated_at)
VALUES (
  1,
  'Blink 渋谷店',
  '東京都渋谷区渋谷1-1-1',
  '03-1234-5678',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 2.5. プランデータの作成（決済用）
-- ============================================

INSERT INTO plans (id, name, display_name, price_monthly, max_dogs, features)
VALUES
  (1, 'free', 'フリープラン', 0, 20, '{"ai_limit": true, "support": "email"}'::jsonb),
  (2, 'standard', 'スタンダードプラン', 5500, 100, '{"ai_limit": false, "support": "priority"}'::jsonb),
  (3, 'pro', 'プロプラン', 11000, NULL, '{"ai_limit": false, "support": "priority", "multi_store": true}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  price_monthly = EXCLUDED.price_monthly,
  max_dogs = EXCLUDED.max_dogs,
  features = EXCLUDED.features;

-- ============================================
-- 3. スタッフデータの作成
-- ============================================
-- 注意: auth.usersテーブルへのユーザー作成は、Supabase Admin APIまたは
-- Supabase Dashboardから手動で行う必要があります。
-- このスクリプトでは、auth_user_idは後で手動で更新してください。

-- まず、nakai@overrrr.comのSupabase Authユーザーを作成する必要があります
-- 方法1: Supabase Dashboard → Authentication → Users → Add user
-- 方法2: Supabase Admin APIを使用（後述のスクリプト参照）

-- スタッフレコードを作成（auth_user_idは後で更新）
INSERT INTO staff (id, email, name, password_hash, auth_user_id, created_at, updated_at)
VALUES (
  1,
  'nakai@overrrr.com',
  '中井 翔太',
  NULL, -- password_hashは不要（Supabase Auth使用）
  NULL, -- 後でSupabase AuthユーザーIDに更新
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  updated_at = CURRENT_TIMESTAMP;

-- スタッフと店舗の関連付け
INSERT INTO staff_stores (staff_id, store_id)
VALUES (1, 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. 顧客（飼い主）データの作成
-- ============================================

INSERT INTO owners (id, store_id, name, name_kana, phone, email, address, emergency_contact, emergency_picker, line_id, memo, created_at, updated_at)
VALUES
  (1, 1, '山田 太郎', 'ヤマダ タロウ', '090-1234-5678', 'yamada@example.com', '東京都渋谷区桜丘町1-1-1', '090-1111-2222', '山田 花子', 'line_id_yamada', '初回利用', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 1, '佐藤 花子', 'サトウ ハナコ', '090-2345-6789', 'sato@example.com', '東京都渋谷区道玄坂2-2-2', '090-2222-3333', '佐藤 次郎', 'line_id_sato', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 1, '鈴木 一郎', 'スズキ イチロウ', '090-3456-7890', 'suzuki@example.com', '東京都渋谷区神南3-3-3', '090-3333-4444', '鈴木 美咲', NULL, '定期利用', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, 1, '田中 美咲', 'タナカ ミサキ', '090-4567-8901', 'tanaka@example.com', '東京都渋谷区恵比寿4-4-4', '090-4444-5555', '田中 健太', 'line_id_tanaka', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, 1, '伊藤 健太', 'イトウ ケンタ', '090-5678-9012', 'ito@example.com', '東京都渋谷区広尾5-5-5', '090-5555-6666', '伊藤 さくら', NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  name_kana = EXCLUDED.name_kana,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  address = EXCLUDED.address,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 5. ペット（犬）データの作成
-- ============================================

INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, weight, color, microchip_number, photo_url, neutered, created_at, updated_at)
VALUES
  (1, 1, 'ポチ', 'ゴールデンレトリバー', '2020-01-15', 'オス', 28.5, 'ゴールド', 'CHIP001', NULL, '済', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 1, 'ココ', 'トイプードル', '2021-03-20', 'メス', 3.2, 'ホワイト', 'CHIP002', NULL, '済', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 2, 'マロン', '柴犬', '2019-11-10', 'オス', 8.5, '赤', 'CHIP003', NULL, '済', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, 3, 'ルナ', 'フレンチブルドッグ', '2022-05-05', 'メス', 10.2, 'ブリンドル', 'CHIP004', NULL, '未', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, 4, 'ソラ', 'ミニチュアダックスフンド', '2021-08-12', 'オス', 5.8, 'ブラックタン', 'CHIP005', NULL, '済', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (6, 5, 'モモ', 'パピヨン', '2022-02-14', 'メス', 4.5, 'ホワイト&ブラウン', 'CHIP006', NULL, '済', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  breed = EXCLUDED.breed,
  birth_date = EXCLUDED.birth_date,
  gender = EXCLUDED.gender,
  weight = EXCLUDED.weight,
  updated_at = CURRENT_TIMESTAMP;

-- 犬の健康情報
INSERT INTO dog_health (dog_id, mixed_vaccine_date, mixed_vaccine_cert_url, rabies_vaccine_date, rabies_vaccine_cert_url, medical_history, allergies, medications, vet_name, vet_phone, food_info, created_at, updated_at)
VALUES
  (1, '2024-01-15', NULL, '2024-01-15', NULL, NULL, 'なし', NULL, '渋谷動物病院', '03-1234-5678', 'ドライフード 1日2回 各200g', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, '2024-03-20', NULL, '2024-03-20', NULL, NULL, 'チキン', NULL, '渋谷動物病院', '03-1234-5678', 'ドライフード 1日2回 各50g', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, '2023-11-10', NULL, '2023-11-10', NULL, '皮膚炎の既往歴あり', 'なし', NULL, '恵比寿ペットクリニック', '03-2345-6789', 'ドライフード 1日2回 各150g', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, '2024-05-05', NULL, '2024-05-05', NULL, NULL, 'なし', NULL, '渋谷動物病院', '03-1234-5678', 'ドライフード 1日2回 各120g', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, '2024-08-12', NULL, '2024-08-12', NULL, NULL, 'なし', NULL, '広尾動物病院', '03-3456-7890', 'ドライフード 1日2回 各80g', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (6, '2024-02-14', NULL, '2024-02-14', NULL, NULL, 'なし', NULL, '渋谷動物病院', '03-1234-5678', 'ドライフード 1日2回 各60g', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (dog_id) DO UPDATE SET
  mixed_vaccine_date = EXCLUDED.mixed_vaccine_date,
  rabies_vaccine_date = EXCLUDED.rabies_vaccine_date,
  updated_at = CURRENT_TIMESTAMP;

-- 犬の性格・特性
INSERT INTO dog_personality (dog_id, personality_description, dog_compatibility, human_reaction, dislikes, likes, biting_habit, biting_habit_detail, barking_habit, barking_habit_detail, toilet_status, crate_training, created_at, updated_at)
VALUES
  (1, 'とてもフレンドリーで人懐っこい性格。他の犬とも仲良く遊べます。', '良好', 'フレンドリー', '大きな音', 'ボール遊び、散歩', 'なし', NULL, '軽度', '来客時に少し吠える', '完璧', '慣れている', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, '活発で遊ぶことが大好き。甘えん坊な一面も。', '良好', 'フレンドリー', '一人でいること', 'おもちゃ、おやつ', 'なし', NULL, '軽度', '興奮すると少し吠える', 'ほぼOK', '慣れている', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, '警戒心が強く、初めて会う人には時間がかかる。慣れるととてもフレンドリー。', '普通', '普通', '大きな声、急な動き', '散歩、おやつ', 'なし', NULL, 'あり', '来客時や散歩中に吠える', '完璧', '慣れている', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, 'のんびりした性格で、他の犬とも問題なく過ごせます。', '良好', 'フレンドリー', '長時間の運動', 'お昼寝、おやつ', 'なし', NULL, 'なし', NULL, '完璧', '慣れている', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, '好奇心旺盛で、新しいことに興味を示します。', '良好', 'フレンドリー', '大きな音', '探索、おもちゃ', 'なし', NULL, '軽度', '興奮すると少し吠える', 'ほぼOK', '練習中', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (6, '明るく元気な性格。人見知りはしない。', '良好', 'フレンドリー', '一人でいること', '遊び、おやつ', 'なし', NULL, '軽度', '来客時に少し吠える', '完璧', '慣れている', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (dog_id) DO UPDATE SET
  personality_description = EXCLUDED.personality_description,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 5.5. トレーニング項目マスタの作成
-- ============================================

-- 既存のトレーニング項目をクリア
DELETE FROM training_item_masters WHERE store_id = 1;

-- デフォルトのトレーニング項目を追加
INSERT INTO training_item_masters (store_id, category, item_key, item_label, display_order, enabled, evaluation_type, has_note) VALUES
  -- 基本トレーニング（3段階評価: ○△×）
  (1, '基本トレーニング', 'praise', '褒め言葉', 1, TRUE, 'simple', TRUE),
  (1, '基本トレーニング', 'name_response', '名前', 2, TRUE, 'simple', FALSE),
  (1, '基本トレーニング', 'collar_grab', '首輪をつかむ', 3, TRUE, 'simple', FALSE),
  (1, '基本トレーニング', 'come', 'おいで', 4, TRUE, 'simple', FALSE),
  (1, '基本トレーニング', 'hand_follow', '手を追う練習', 5, TRUE, 'simple', FALSE),
  (1, '基本トレーニング', 'holding', 'ホールディング', 6, TRUE, 'simple', FALSE),
  (1, '基本トレーニング', 'settle', '足元で落ち着く・休む', 7, TRUE, 'simple', FALSE),
  -- コマンドトレーニング（デフォルト3段階、店舗設定で6段階A-Fに切替可能）
  (1, 'コマンドトレーニング', 'sit', 'オスワリ', 1, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'down', 'フセ', 2, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'stand', 'タッテ', 3, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'stay', 'マテ', 4, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'release', '開放の合図', 5, TRUE, 'advanced', TRUE),
  (1, 'コマンドトレーニング', 'heel', 'ヒール', 6, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'side', 'サイド', 7, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'mat', 'マット', 8, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'go_in', 'ゴーイン', 9, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'spin', 'スピンorくるん（右）', 10, TRUE, 'advanced', FALSE),
  (1, 'コマンドトレーニング', 'turn', 'ターン（左）', 11, TRUE, 'advanced', FALSE)
ON CONFLICT (store_id, item_key) DO UPDATE SET
  category = EXCLUDED.category,
  item_label = EXCLUDED.item_label,
  display_order = EXCLUDED.display_order,
  enabled = EXCLUDED.enabled,
  evaluation_type = EXCLUDED.evaluation_type,
  has_note = EXCLUDED.has_note;

-- ============================================
-- 6. 契約データの作成
-- ============================================

INSERT INTO contracts (id, dog_id, contract_type, course_name, total_sessions, remaining_sessions, valid_until, monthly_sessions, price, created_at, updated_at)
VALUES
  (1, 1, '月謝制', 'レギュラーコース', NULL, NULL, '2025-02-28', 8, 55000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (2, 2, 'チケット制', 'フレキシブルコース', 10, 7, '2025-06-30', NULL, 60000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (3, 3, '月謝制', 'レギュラーコース', NULL, NULL, '2025-02-28', 8, 55000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (4, 4, 'チケット制', 'フレキシブルコース', 20, 18, '2025-12-31', NULL, 110000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (5, 5, '単発', NULL, 1, 1, '2025-12-31', NULL, 8000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (6, 6, '月謝制', 'レギュラーコース', NULL, NULL, '2025-02-28', 8, 55000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  contract_type = EXCLUDED.contract_type,
  remaining_sessions = EXCLUDED.remaining_sessions,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 7. 予約データの作成（過去・現在・未来）
-- ============================================

-- 過去の予約（完了済み）
INSERT INTO reservations (id, store_id, dog_id, reservation_date, reservation_time, status, checked_in_at, cancelled_at, memo, created_at, updated_at)
VALUES
  (1, 1, 1, CURRENT_DATE - INTERVAL '7 days', '09:00:00', 'チェックイン済', CURRENT_TIMESTAMP - INTERVAL '7 days', NULL, '元気に遊んでいました', CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  (2, 1, 2, CURRENT_DATE - INTERVAL '5 days', '10:00:00', 'チェックイン済', CURRENT_TIMESTAMP - INTERVAL '5 days', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (3, 1, 3, CURRENT_DATE - INTERVAL '3 days', '11:00:00', 'チェックイン済', CURRENT_TIMESTAMP - INTERVAL '3 days', NULL, '他の犬と仲良く遊んでいました', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (4, 1, 4, CURRENT_DATE - INTERVAL '2 days', '14:00:00', 'チェックイン済', CURRENT_TIMESTAMP - INTERVAL '2 days', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (5, 1, 5, CURRENT_DATE - INTERVAL '1 day', '15:00:00', 'チェックイン済', CURRENT_TIMESTAMP - INTERVAL '1 day', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),

  -- 今日の予約
  (6, 1, 1, CURRENT_DATE, '09:00:00', 'チェックイン済', CURRENT_TIMESTAMP - INTERVAL '2 hours', NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP),
  (7, 1, 2, CURRENT_DATE, '10:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
  (8, 1, 3, CURRENT_DATE, '14:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),

  -- 未来の予約
  (9, 1, 1, CURRENT_DATE + INTERVAL '1 day', '09:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP),
  (10, 1, 4, CURRENT_DATE + INTERVAL '1 day', '10:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP),
  (11, 1, 5, CURRENT_DATE + INTERVAL '1 day', '14:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
  (12, 1, 6, CURRENT_DATE + INTERVAL '1 day', '15:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
  (13, 1, 2, CURRENT_DATE + INTERVAL '2 days', '09:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP),
  (14, 1, 3, CURRENT_DATE + INTERVAL '2 days', '10:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP),
  (15, 1, 1, CURRENT_DATE + INTERVAL '3 days', '09:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP),
  (16, 1, 4, CURRENT_DATE + INTERVAL '3 days', '14:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '4 days', CURRENT_TIMESTAMP),
  (17, 1, 5, CURRENT_DATE + INTERVAL '4 days', '10:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP),
  (18, 1, 6, CURRENT_DATE + INTERVAL '4 days', '15:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP),
  (19, 1, 2, CURRENT_DATE + INTERVAL '5 days', '09:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP),
  (20, 1, 3, CURRENT_DATE + INTERVAL '5 days', '11:00:00', '予定', NULL, NULL, NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 8. 日誌データの作成（過去の予約に関連）
-- ============================================

INSERT INTO journals (id, reservation_id, dog_id, staff_id, journal_date, visit_count, morning_toilet_status, morning_toilet_location, afternoon_toilet_status, afternoon_toilet_location, training_data, comment, next_visit_date, photos, created_at, updated_at)
VALUES
  (1, 1, 1, 1, CURRENT_DATE - INTERVAL '7 days', 1, '成功', '外', '成功', '外', '{"基本動作": "おすわり、待てができました"}', 'とても元気に遊んでいました。他の犬とも仲良く過ごせました。', CURRENT_DATE - INTERVAL '6 days', NULL, CURRENT_TIMESTAMP - INTERVAL '7 days', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  (2, 2, 2, 1, CURRENT_DATE - INTERVAL '5 days', 1, '成功', '外', '成功', '外', '{"基本動作": "おすわりができました"}', '活発に遊んでいました。', CURRENT_DATE - INTERVAL '4 days', NULL, CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  (3, 3, 3, 1, CURRENT_DATE - INTERVAL '3 days', 1, '成功', '外', '成功', '外', '{"基本動作": "待てができました"}', '初めての利用でしたが、すぐに慣れてくれました。', CURRENT_DATE - INTERVAL '2 days', NULL, CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  (4, 4, 4, 1, CURRENT_DATE - INTERVAL '2 days', 1, '成功', '外', '成功', '外', '{"基本動作": "おすわり、待てができました"}', 'のんびりと過ごしていました。', CURRENT_DATE - INTERVAL '1 day', NULL, CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  (5, 5, 5, 1, CURRENT_DATE - INTERVAL '1 day', 1, '成功', '外', '成功', '外', '{"基本動作": "おすわりができました"}', '好奇心旺盛で、いろいろなことに興味を示していました。', CURRENT_DATE, NULL, CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day')
ON CONFLICT (id) DO UPDATE SET
  comment = EXCLUDED.comment,
  updated_at = CURRENT_TIMESTAMP;

-- ============================================
-- 9. シーケンスのリセット（オプション）
-- ============================================
-- IDの連番をリセットしたい場合に実行

-- SELECT setval('stores_id_seq', (SELECT MAX(id) FROM stores));
-- SELECT setval('staff_id_seq', (SELECT MAX(id) FROM staff));
-- SELECT setval('owners_id_seq', (SELECT MAX(id) FROM owners));
-- SELECT setval('dogs_id_seq', (SELECT MAX(id) FROM dogs));
-- SELECT setval('contracts_id_seq', (SELECT MAX(id) FROM contracts));
-- SELECT setval('reservations_id_seq', (SELECT MAX(id) FROM reservations));
-- SELECT setval('journals_id_seq', (SELECT MAX(id) FROM journals));

-- ============================================
-- 完了メッセージ
-- ============================================

SELECT 'シードデータの投入が完了しました。' as message;
SELECT '次に、Supabase Authユーザーを作成して、staffテーブルのauth_user_idを更新してください。' as next_step;
