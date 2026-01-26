# Supabase接続文字列の取得方法

Supabaseダッシュボードで接続文字列を取得する方法を説明します。

## 方法1: 接続文字列を直接取得（最も簡単）

### 手順

1. [Supabase](https://supabase.com) にログイン
2. プロジェクトを選択
3. 左サイドバーから **「Settings」**（⚙️ 設定アイコン）をクリック
4. **「Database」** タブを選択
5. ページを下にスクロール
6. **「Connection string」** セクションを探す
7. **「URI」** タブをクリック
8. 表示された接続文字列をコピー

### 表示例

```
postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
```

**重要**: `[YOUR-PASSWORD]` が表示されている場合は、プロジェクト作成時に設定した実際のパスワードに置き換えてください。

## 方法2: 接続情報から手動構築

接続文字列が見つからない場合、以下の情報から手動で構築できます。

### 手順

1. Supabaseダッシュボード → Settings → Database
2. **「Connection info」** セクションで以下の情報を確認：
   - **Host**: `db.[PROJECT-REF].supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: プロジェクト作成時に設定したパスワード（表示されない場合は、プロジェクト設定から再設定可能）

3. 以下の形式で接続文字列を構築：

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

### 具体例

```
postgresql://postgres:your-password-here@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## 方法3: Connection Poolingを使用（本番環境推奨）

接続プーリングを使用すると、より効率的にデータベースに接続できます。

### 手順

1. Settings → Database → **「Connection pooling」** セクション
2. **「Session mode」** または **「Transaction mode」** を選択
3. 接続文字列をコピー

**注意**: 接続プーリングを使用する場合、ポート番号が異なる場合があります（通常は `6543` または `5432`）。

## パスワードに特殊文字が含まれている場合

パスワードに特殊文字（`@`, `:`, `/`, `#`, `?` など）が含まれている場合は、URLエンコードが必要です。

### URLエンコード例

- `@` → `%40`
- `:` → `%3A`
- `/` → `%2F`
- `#` → `%23`
- `?` → `%3F`

### 例

パスワードが `P@ssw0rd!` の場合：

```
postgresql://postgres:P%40ssw0rd%21@db.abcdefghijklmnop.supabase.co:5432/postgres
```

## 接続文字列が見つからない場合の確認事項

1. **プロジェクトが正しく選択されているか確認**
   - ダッシュボードの左上でプロジェクト名を確認

2. **権限を確認**
   - プロジェクトのオーナーまたは管理者権限が必要です

3. **ブラウザのキャッシュをクリア**
   - ページをリロード（Ctrl+R / Cmd+R）

4. **別のブラウザで試す**

5. **Supabaseのバージョンを確認**
   - 新しいUIと古いUIで表示場所が異なる場合があります

## 接続文字列の形式

### 標準形式

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]
```

### SSL接続（本番環境推奨）

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=require
```

### 接続プーリング（Transaction mode）

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

## 環境変数への設定

取得した接続文字列を環境変数 `DATABASE_URL` に設定します。

### ローカル開発（.envファイル）

```env
DATABASE_URL=postgresql://postgres:your-password@db.abcdefghijklmnop.supabase.co:5432/postgres
```

### Vercel（環境変数設定）

1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. **Key**: `DATABASE_URL`
3. **Value**: 接続文字列を貼り付け
4. **Environment**: Production, Preview, Development を選択
5. 「Save」をクリック

## トラブルシューティング

### 接続エラーが発生する場合

1. **パスワードが正しいか確認**
   - プロジェクト作成時に設定したパスワードを使用

2. **ホスト名が正しいか確認**
   - `db.[PROJECT-REF].supabase.co` の形式を確認

3. **ポート番号を確認**
   - 通常は `5432`、接続プーリングの場合は `6543`

4. **SSL設定を確認**
   - 本番環境では `?sslmode=require` を追加

5. **ファイアウォール設定を確認**
   - SupabaseのIPアドレスが許可されているか確認（通常は不要）

## 参考リンク

- [Supabase Database Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
