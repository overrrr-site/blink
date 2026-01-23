-- ダミーデータ投入スクリプト
-- 既存データがある場合は削除（開発用）

-- 日誌を削除
DELETE FROM journals;
-- 登園前入力を削除
DELETE FROM pre_visit_inputs;
-- 予約を削除
DELETE FROM reservations;
-- 契約を削除
DELETE FROM contracts;
-- 犬の性格情報を削除
DELETE FROM dog_personality;
-- 犬の健康情報を削除
DELETE FROM dog_health;
-- 犬を削除
DELETE FROM dogs;
-- 飼い主を削除
DELETE FROM owners;

-- 店舗を確認（既にある場合はそのまま使う）
INSERT INTO stores (id, name, address, phone)
VALUES (1, 'わんわんパーク渋谷店', '東京都渋谷区神宮前1-2-3', '03-1234-5678')
ON CONFLICT (id) DO NOTHING;

-- スタッフを確認
INSERT INTO staff (id, email, password_hash, name)
VALUES (1, 'admin@example.com', '$2b$10$dummy', '山田 太郎')
ON CONFLICT (id) DO NOTHING;

-- スタッフと店舗の関連
INSERT INTO staff_stores (staff_id, store_id)
VALUES (1, 1)
ON CONFLICT DO NOTHING;

-- 飼い主データ
INSERT INTO owners (id, store_id, name, name_kana, phone, email, address, emergency_contact, memo)
VALUES
  (1, 1, '田中 花子', 'タナカ ハナコ', '090-1234-5678', 'tanaka@example.com', '東京都渋谷区神宮前1-2-3 パークハイツ101', '田中 太郎（夫）080-9876-5432', '送迎時は裏口からお願いしたいとのこと'),
  (2, 1, '佐藤 健一', 'サトウ ケンイチ', '080-2345-6789', 'sato@example.com', '東京都港区南青山2-3-4', '佐藤 美咲（妻）090-8765-4321', NULL),
  (3, 1, '鈴木 美穂', 'スズキ ミホ', '070-3456-7890', 'suzuki@example.com', '東京都世田谷区三軒茶屋3-4-5', NULL, '犬に関してとても熱心な方'),
  (4, 1, '高橋 誠', 'タカハシ マコト', '090-4567-8901', 'takahashi@example.com', '東京都目黒区自由が丘4-5-6', '高橋 由美子（母）080-7654-3210', NULL),
  (5, 1, '渡辺 あゆみ', 'ワタナベ アユミ', '080-5678-9012', 'watanabe@example.com', '東京都新宿区西新宿5-6-7', NULL, NULL);

-- 犬データ
INSERT INTO dogs (id, owner_id, name, breed, birth_date, gender, weight, color, neutered, photo_url)
VALUES
  (1, 1, 'もも', 'トイプードル', '2020-05-15', 'メス', 4.2, 'アプリコット', '済', 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200'),
  (2, 2, 'ココ', '柴犬', '2021-03-20', 'オス', 9.5, '赤', '済', 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=200'),
  (3, 3, 'レオ', 'ゴールデンレトリバー', '2022-01-10', 'オス', 28.0, 'ゴールデン', '未', 'https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=200'),
  (4, 4, 'マロン', 'チワワ', '2019-08-25', 'メス', 2.8, 'クリーム', '済', 'https://images.unsplash.com/photo-1605897472359-85e4b94d685d?w=200'),
  (5, 5, 'そら', 'ミニチュアダックスフンド', '2021-11-05', 'オス', 5.1, 'レッド', '済', 'https://images.unsplash.com/photo-1612195583950-b8fd34c87093?w=200'),
  (6, 1, 'チョコ', 'トイプードル', '2022-07-20', 'オス', 3.8, 'ブラウン', '未', 'https://images.unsplash.com/photo-1594149929911-78975a43d4f5?w=200');

-- 犬の健康情報
INSERT INTO dog_health (dog_id, mixed_vaccine_date, rabies_vaccine_date, allergies, medical_history, vet_name, vet_phone)
VALUES
  (1, '2023-11-01', '2024-04-15', 'なし', '特になし', '渋谷動物病院', '03-1111-2222'),
  (2, '2024-06-15', '2024-05-20', '鶏肉アレルギー', NULL, '港区動物クリニック', '03-2222-3333'),
  (3, '2024-08-10', '2024-07-25', 'なし', '股関節形成不全の経過観察中', '世田谷ペット病院', '03-3333-4444'),
  (4, '2024-01-20', '2024-03-10', 'なし', '膝蓋骨脱臼（グレード1）', '目黒動物医療センター', '03-4444-5555'),
  (5, '2024-09-05', '2024-08-15', 'なし', '椎間板ヘルニア予防観察', '新宿ペットクリニック', '03-5555-6666'),
  (6, '2024-10-10', '2024-09-20', 'なし', NULL, '渋谷動物病院', '03-1111-2222');

-- 犬の性格情報
INSERT INTO dog_personality (dog_id, dog_compatibility, human_reaction, toilet_status, crate_training, personality_description)
VALUES
  (1, '良好', 'フレンドリー', '完璧', '慣れている', '穏やかで人懐っこい性格。他の犬とも仲良くできる'),
  (2, '普通', '普通', 'ほぼOK', '練習中', '少し警戒心が強いが、慣れると甘えん坊'),
  (3, '良好', 'フレンドリー', 'トレーニング中', '慣れている', '元気いっぱいで遊ぶのが大好き'),
  (4, '苦手', '怖がり', '完璧', '苦手', '小型犬なので大きい犬が苦手。静かな環境を好む'),
  (5, '良好', 'フレンドリー', 'ほぼOK', '慣れている', '好奇心旺盛で探検好き'),
  (6, '良好', 'フレンドリー', 'トレーニング中', '練習中', 'まだ若いので元気いっぱい');

-- 予約データ（過去〜未来の予約）
INSERT INTO reservations (id, store_id, dog_id, reservation_date, reservation_time, status, memo)
VALUES
  -- 過去の予約（日誌作成済み）
  (1, 1, 1, CURRENT_DATE - INTERVAL '7 days', '09:00', 'チェックイン済', NULL),
  (2, 1, 2, CURRENT_DATE - INTERVAL '7 days', '09:30', 'チェックイン済', NULL),
  (3, 1, 3, CURRENT_DATE - INTERVAL '5 days', '09:00', 'チェックイン済', NULL),
  (4, 1, 1, CURRENT_DATE - INTERVAL '3 days', '09:00', 'チェックイン済', NULL),
  (5, 1, 4, CURRENT_DATE - INTERVAL '3 days', '10:00', 'チェックイン済', NULL),

  -- 過去の予約（日誌未作成）
  (6, 1, 5, CURRENT_DATE - INTERVAL '2 days', '09:00', 'チェックイン済', NULL),
  (7, 1, 6, CURRENT_DATE - INTERVAL '1 day', '09:30', 'チェックイン済', NULL),
  (8, 1, 2, CURRENT_DATE - INTERVAL '1 day', '10:00', 'チェックイン済', NULL),

  -- 今日の予約
  (9, 1, 1, CURRENT_DATE, '09:00', '予定', '午前中にお散歩希望'),
  (10, 1, 3, CURRENT_DATE, '09:30', '予定', NULL),
  (11, 1, 4, CURRENT_DATE, '10:00', '予定', '足腰に注意'),

  -- 明日以降の予約
  (12, 1, 2, CURRENT_DATE + INTERVAL '1 day', '09:00', '予定', NULL),
  (13, 1, 5, CURRENT_DATE + INTERVAL '1 day', '09:30', '予定', NULL),
  (14, 1, 1, CURRENT_DATE + INTERVAL '2 days', '09:00', '予定', NULL),
  (15, 1, 6, CURRENT_DATE + INTERVAL '3 days', '09:00', '予定', NULL),
  (16, 1, 3, CURRENT_DATE + INTERVAL '4 days', '09:00', '予定', NULL),
  (17, 1, 4, CURRENT_DATE + INTERVAL '5 days', '10:00', '予定', NULL);

-- 登園前入力データ（今日の予約分）
INSERT INTO pre_visit_inputs (reservation_id, morning_urination, morning_defecation, breakfast_status, health_status, notes)
VALUES
  (9, true, true, '完食', '元気', '昨日夜少し咳をしていました'),
  (10, true, false, '少し残した', '元気', NULL);

-- 日誌データ（過去の予約分）
INSERT INTO journals (id, reservation_id, dog_id, staff_id, journal_date, visit_count, morning_toilet_status, morning_toilet_location, afternoon_toilet_status, afternoon_toilet_location, comment, next_visit_date)
VALUES
  (1, 1, 1, 1, CURRENT_DATE - INTERVAL '7 days', 65, '成功', '自ら指定の場所', '成功', '散歩中', 'ももちゃん、今日も元気いっぱいでした！他のわんちゃんとも仲良く遊べました。トイレも完璧です。', CURRENT_DATE - INTERVAL '3 days'),
  (2, 2, 2, 1, CURRENT_DATE - INTERVAL '7 days', 42, '成功', '誘導して指定の場所', '成功', '誘導して指定の場所', 'ココくん、最初は少し緊張気味でしたが、午後には慣れてきました。おやつの時間が一番楽しそうでした。', CURRENT_DATE - INTERVAL '1 day'),
  (3, 3, 3, 1, CURRENT_DATE - INTERVAL '5 days', 28, '成功', '散歩中', '成功', '散歩中', 'レオくん、今日も元気に走り回っていました！大きな体ですが他の犬にも優しく接してくれます。', CURRENT_DATE + INTERVAL '4 days'),
  (4, 4, 1, 1, CURRENT_DATE - INTERVAL '3 days', 66, '成功', '自ら指定の場所', '成功', '自ら指定の場所', 'ももちゃん、トレーニングの成果が出てきています。「おすわり」「まて」がとても上手になりました！', CURRENT_DATE),
  (5, 5, 4, 1, CURRENT_DATE - INTERVAL '3 days', 35, '成功', '誘導して指定の場所', '成功', '自ら指定の場所', 'マロンちゃん、今日は大きな犬がいなかったので落ち着いて過ごせました。午後は日向ぼっこを楽しんでいました。', CURRENT_DATE + INTERVAL '5 days');

-- シーケンスのリセット
SELECT setval('owners_id_seq', (SELECT MAX(id) FROM owners));
SELECT setval('dogs_id_seq', (SELECT MAX(id) FROM dogs));
SELECT setval('reservations_id_seq', (SELECT MAX(id) FROM reservations));
SELECT setval('journals_id_seq', (SELECT MAX(id) FROM journals));
