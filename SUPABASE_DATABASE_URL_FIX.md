# Supabase DATABASE_URL の修正

## 問題

現在の `DATABASE_URL`:
```
postgresql://postgres.[password]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

この形式は**間違っています**。`postgres.[password]` の部分が正しくありません。

## 正しい形式

### 接続プーリングURL（推奨）

**Session mode** または **Transaction mode** の場合:

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

**例**:
```
postgresql://postgres.fqepwzwkztjnpfeyxnke:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

### 通常の接続URL（直接接続）

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**例**:
```
postgresql://postgres:your-password@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
```

## 修正方法

### 方法1: Supabase Dashboardから正しいURLを取得

1. Supabase Dashboard → **Settings** → **Database**
2. **Connection string** セクションを開く
3. **Connection pooling** タブを選択
4. **Session mode** または **Transaction mode** を選択
5. 表示された接続文字列をコピー
6. `[YOUR-PASSWORD]` を実際のパスワードに置き換え

### 方法2: 通常の接続URLを使用（簡単）

接続プーリングが不要な場合は、通常の接続URLを使用：

1. Supabase Dashboard → **Settings** → **Database**
2. **Connection string** → **URI** タブ
3. 接続文字列をコピー
4. `[YOUR-PASSWORD]` を実際のパスワードに置き換え

## Vercel環境変数の設定

Vercel Dashboard → Settings → Environment Variables で以下を設定：

```
DATABASE_URL=postgresql://postgres.fqepwzwkztjnpfeyxnke:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

または（通常の接続URL）:

```
DATABASE_URL=postgresql://postgres:your-password@db.fqepwzwkztjnpfeynpke.supabase.co:5432/postgres
```

## パスワードに特殊文字が含まれている場合

パスワードに特殊文字（`@`, `#`, `%` など）が含まれている場合は、URLエンコードが必要です：

| 文字 | URLエンコード |
|------|--------------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |

**例**: パスワードが `P@ssw0rd#123` の場合
```
postgresql://postgres.fqepwzwkztjnpfeyxnke:P%40ssw0rd%23123@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres
```

## 確認

設定後、以下で確認：

1. Vercel Dashboard → Deployments → 最新のデプロイメント
2. Functions タブでログを確認
3. データベース接続エラーが解消されているか確認

## 参考

- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
- [Supabase Connection String](https://supabase.com/docs/guides/database/connecting-to-postgres)
