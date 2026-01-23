# 本番環境シードデータ投入ガイド

`nakai@overrrr.com` でGoogleログインできるアカウントと、顧客・ペット・予約のダミーデータを作成します。

## 手順

### 1. 既存データのクリアとシードデータの投入

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **SQL Editor** を開く
4. **New query** をクリック
5. `server/src/db/seed_production.sql` の内容をコピーして貼り付け
6. **Run** をクリックして実行

### 2. Supabase Authユーザーの作成

`nakai@overrrr.com` のSupabase Authユーザーを作成します。

#### 方法A: Supabase Dashboardから作成（推奨）

1. Supabase Dashboard → **Authentication** → **Users**
2. **Add user** をクリック
3. 以下を入力:
   - **Email**: `nakai@overrrr.com`
   - **Password**: （自動生成または任意のパスワード）
   - **Email confirmed**: ✅ ON
4. **Create user** をクリック
5. 作成されたユーザーの **UUID** をコピー（例: `24a4aa9a-b081-4042-848c-ef004cd1ef51`）

#### 方法B: Node.jsスクリプトを使用

```bash
cd server
export SUPABASE_URL=https://fqepwzwkztjnpfeyxnke.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
node src/db/create_auth_user.js
```

スクリプトが出力するUUIDをコピーしてください。

### 3. staffテーブルのauth_user_idを更新

1. Supabase Dashboard → **SQL Editor**
2. 以下のSQLを実行（`[AUTH_USER_UUID]` を手順2で取得したUUIDに置き換え）:

```sql
UPDATE staff
SET auth_user_id = '[AUTH_USER_UUID]'
WHERE email = 'nakai@overrrr.com';
```

**例**:
```sql
UPDATE staff
SET auth_user_id = '24a4aa9a-b081-4042-848c-ef004cd1ef51'
WHERE email = 'nakai@overrrr.com';
```

### 4. 確認

以下のSQLで確認できます:

```sql
SELECT 
  s.id,
  s.email,
  s.name,
  s.auth_user_id,
  au.email as auth_email,
  au.created_at as auth_created_at
FROM staff s
LEFT JOIN auth.users au ON s.auth_user_id = au.id
WHERE s.email = 'nakai@overrrr.com';
```

`auth_user_id` と `auth_email` が正しく表示されれば成功です。

## 作成されるデータ

### スタッフ
- **中井 翔太** (`nakai@overrrr.com`) - Googleログイン可能

### 店舗
- **Blink 渋谷店**

### 顧客（5名）
1. 山田 太郎
2. 佐藤 花子
3. 鈴木 一郎
4. 田中 美咲
5. 伊藤 健太

### ペット（6匹）
1. ポチ（ゴールデンレトリバー）
2. ココ（トイプードル）
3. マロン（柴犬）
4. ルナ（フレンチブルドッグ）
5. ソラ（ミニチュアダックスフンド）
6. モモ（パピヨン）

### 予約（20件）
- 過去の予約: 5件（完了済み）
- 今日の予約: 3件
- 未来の予約: 12件

### 日誌（5件）
- 過去の予約に関連する日誌データ

## トラブルシューティング

### エラー: "duplicate key value violates unique constraint"

既存のデータが残っている可能性があります。`seed_production.sql` の削除部分を再実行してください。

### エラー: "foreign key constraint"

外部キー制約エラーが発生した場合、削除順序を確認してください。`seed_production.sql` は正しい順序で削除しています。

### auth_user_idがNULLのまま

手順2と3を再確認してください。Supabase Authユーザーが作成され、staffテーブルが更新されているか確認してください。

## 参考ファイル

- `server/src/db/seed_production.sql` - メインのシードデータSQL
- `server/src/db/create_auth_user_and_link.sql` - Authユーザー作成手順
- `server/src/db/create_auth_user.js` - Authユーザー作成スクリプト
