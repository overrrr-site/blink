# トラブルシューティングガイド

## 予約カレンダーが空になる問題

### 症状
- 予約カレンダー画面に予約が表示されない
- ダミーデータはデータベースに存在する

### 確認事項

#### 1. データベースに予約データが存在するか確認

```bash
# PostgreSQLに接続
psql -U postgres -d pet_carte

# 予約データを確認
SELECT r.id, r.reservation_date, r.reservation_time, d.name as dog_name, r.store_id
FROM reservations r
JOIN dogs d ON r.dog_id = d.id
ORDER BY r.reservation_date;

# 店舗IDを確認
SELECT id, name FROM stores;
```

#### 2. ログイン時のstoreIdが正しく設定されているか確認

ブラウザの開発者ツール（F12）で以下を確認：

```javascript
// Console タブで実行
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Store ID:', payload.storeId);
```

#### 3. APIリクエストの確認

ブラウザの開発者ツールの Network タブで：
- `/api/reservations?month=2024-01` のリクエストを確認
- レスポンスのステータスコードと内容を確認
- エラーメッセージがないか確認

#### 4. サーバーログの確認

サーバーのターミナルで以下が表示されているか確認：
```
📅 Reservations query: { month: '2024-01', storeId: 1, count: X }
```

### 解決方法

#### 方法1: シードデータを再投入

```bash
cd server
npm run db:seed
```

#### 方法2: 手動で予約データを作成

```sql
-- 店舗IDを確認
SELECT id FROM stores LIMIT 1;

-- 犬IDを確認
SELECT id FROM dogs LIMIT 1;

-- 予約を作成（store_id と dog_id を実際の値に置き換え）
INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status)
VALUES (1, 1, CURRENT_DATE, '09:00:00', '予定');
```

#### 方法3: storeIdがnullの場合

ログイン時に `store_id` が `null` の可能性があります。

```sql
-- スタッフと店舗の関連を確認
SELECT s.id, s.name, s.email, ss.store_id
FROM staff s
LEFT JOIN staff_stores ss ON s.id = ss.staff_id;

-- 関連が存在しない場合は作成
INSERT INTO staff_stores (staff_id, store_id)
VALUES (
  (SELECT id FROM staff WHERE email = 'admin@example.com'),
  (SELECT id FROM stores LIMIT 1)
);
```

### よくある問題

#### 問題1: 月のフィルタリングが機能しない

**原因**: `month` パラメータが `'yyyy-MM'` 形式で送られているが、SQLで日付として解釈できない

**解決**: API側で `'yyyy-MM-01'` に変換（既に修正済み）

#### 問題2: storeIdがnull

**原因**: ログイン時に `staff_stores` テーブルに関連が存在しない

**解決**: シードデータを再実行、または手動で関連を作成

#### 問題3: 予約データが別の月にある

**原因**: 現在表示している月と予約データの月が異なる

**解決**: カレンダーで予約がある月に移動して確認

### デバッグ方法

#### フロントエンド側

ブラウザのConsoleで以下を確認：
```javascript
// 予約データの取得状況
console.log('Reservations:', reservations);

// APIレスポンスの確認
// Network タブで /api/reservations のレスポンスを確認
```

#### バックエンド側

サーバーのターミナルで以下を確認：
- SQLクエリのログ
- エラーメッセージ
- パラメータの値

### テスト用SQL

予約データを手動で作成する場合：

```sql
-- 今日の予約
INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status)
SELECT 
  s.id as store_id,
  d.id as dog_id,
  CURRENT_DATE as reservation_date,
  '09:00:00'::time as reservation_time,
  '予定' as status
FROM stores s
CROSS JOIN dogs d
LIMIT 1;

-- 今月の火曜日と金曜日に予約
DO $$
DECLARE
  store_id_val INTEGER;
  dog_id_val INTEGER;
  current_date_val DATE;
  reservation_date_val DATE;
BEGIN
  -- 店舗IDと犬IDを取得
  SELECT id INTO store_id_val FROM stores LIMIT 1;
  SELECT id INTO dog_id_val FROM dogs LIMIT 1;
  
  -- 今月の1日から30日までループ
  FOR i IN 0..29 LOOP
    reservation_date_val := DATE_TRUNC('month', CURRENT_DATE) + (i || ' days')::interval;
    
    -- 火曜日(2)または金曜日(5)の場合
    IF EXTRACT(DOW FROM reservation_date_val) IN (2, 5) THEN
      INSERT INTO reservations (store_id, dog_id, reservation_date, reservation_time, status)
      VALUES (store_id_val, dog_id_val, reservation_date_val, '09:00:00', '予定')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;
```
