# Supabaseデータベースパスワードの確認方法

## パスワードとは？

Supabaseプロジェクトを作成した時に設定した**データベースパスワード**です。

## 確認方法

### 方法1: Supabase Dashboardで確認

1. [Supabase Dashboard](https://app.supabase.com/) にアクセス
2. プロジェクトを選択
3. **Settings** → **Database** を開く
4. **Connection string** セクションを確認
5. **URI** タブを選択
6. 接続文字列が表示されます：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
   ```
   - `[YOUR-PASSWORD]` の部分がパスワードです

### 方法2: 接続文字列から直接取得

接続文字列が表示されている場合：
- `postgresql://postgres:ここがパスワード@db...` の `ここがパスワード` の部分を使用

### 方法3: パスワードを忘れた場合

**パスワードをリセットする必要があります**：

1. Supabase Dashboard → **Settings** → **Database**
2. **Database password** セクションを探す
3. **Reset database password** をクリック
4. 新しいパスワードを設定
5. ⚠️ **注意**: パスワードをリセットすると、既存の接続が切断される可能性があります

## 環境変数への設定

取得したパスワードを使って、接続文字列を完成させます：

```env
DATABASE_URL=postgresql://postgres:あなたのパスワード@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
```

**例**（パスワードが `MySecurePassword123!` の場合）:
```env
DATABASE_URL=postgresql://postgres:MySecurePassword123!@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
```

## 注意事項

- パスワードに特殊文字（`@`, `#`, `%` など）が含まれている場合、URLエンコードが必要な場合があります
- パスワードは機密情報です。Gitにコミットしないでください
- `.env` ファイルは `.gitignore` に含まれていることを確認してください

## トラブルシューティング

### 接続エラーが発生する場合

1. パスワードが正しいか確認
2. 特殊文字が含まれている場合は、URLエンコードを試す
3. Supabase Dashboardで接続文字列を再生成する

### パスワードの特殊文字のURLエンコード

| 文字 | URLエンコード |
|------|--------------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |
| `?` | `%3F` |

**例**: パスワードが `P@ssw0rd#123` の場合
```
postgresql://postgres:P%40ssw0rd%23123@db.fqepwzwkztjnpfeyxnke.supabase.co:5432/postgres
```
