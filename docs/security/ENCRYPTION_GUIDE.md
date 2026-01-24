# 機密情報の暗号化ガイド

## 概要

本システムでは、データベースに保存される機密情報をAES-256-GCMで暗号化しています。

## 暗号化対象の機密情報

### ✅ 実装済み（暗号化中）

#### 1. LINE Messaging API認証情報
- **テーブル**: `stores`
- **暗号化対象**:
  - `line_channel_secret` - チャネルシークレット
  - `line_channel_access_token` - チャネルアクセストークン
- **実装ファイル**: 
  - `server/src/routes/stores.ts`
  - `server/src/services/lineMessagingService.ts`

#### 2. Googleカレンダー連携トークン
- **テーブル**: `google_calendar_integrations`
- **暗号化対象**:
  - `access_token` - OAuthアクセストークン
  - `refresh_token` - OAuthリフレッシュトークン
- **実装ファイル**: 
  - `server/src/services/googleCalendar.ts`

### ⚠️ 検討が必要（現状は平文保存）

#### 1. 個人情報（個人情報保護法の観点）
- **テーブル**: `owners`
- **対象フィールド**:
  - `phone` - 電話番号
  - `email` - メールアドレス
  - `address` - 住所
  - `line_id` - LINE ID
- **検討事項**:
  - 個人情報保護法の要件に基づく
  - 検索・ソート機能への影響
  - パフォーマンスへの影響

#### 2. 決済関連ID
- **テーブル**: `stores`
- **対象フィールド**:
  - `payjp_customer_id` - PAY.JP顧客ID
  - `payjp_subscription_id` - PAY.JPサブスクリプションID
- **検討事項**:
  - IDのみで直接的な決済情報ではない
  - 機密性は中程度

#### 3. その他の識別子
- **テーブル**: `dogs`
- **対象フィールド**:
  - `microchip_number` - マイクロチップ番号
- **検討事項**:
  - 個人情報に該当する可能性

## 暗号化キーの管理

### 環境変数の設定

```env
# 32文字以上のランダムな文字列
ENCRYPTION_KEY=your-32-character-or-longer-encryption-key-here
```

### キーの生成方法

```bash
# OpenSSLを使用
openssl rand -base64 32

# Node.jsを使用
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### セキュリティ要件

- **最小長**: 32文字
- **推奨**: 64文字以上のBase64エンコードされた文字列
- **保管**: 環境変数として管理（Gitにコミットしない）
- **ローテーション**: 定期的な変更を推奨（変更時は既存データの再暗号化が必要）

## 暗号化の実装

### 使用アルゴリズム

- **アルゴリズム**: AES-256-GCM
- **モード**: GCM（認証付き暗号）
- **初期化ベクトル**: ランダム生成（各暗号化ごとに異なる）

### 実装ファイル

- `server/src/utils/encryption.ts` - 暗号化/復号化ユーティリティ

### 使用方法

```typescript
import { encrypt, decrypt } from '../utils/encryption.js';

// 暗号化
const encrypted = encrypt('機密情報');

// 復号化
const decrypted = decrypt(encrypted);
```

## 既存データの移行

既に平文で保存されているデータを暗号化する場合：

1. バックアップを取得
2. マイグレーションスクリプトを作成
3. 暗号化キーが設定されていることを確認
4. マイグレーションを実行
5. 動作確認

## トラブルシューティング

### エラー: "ENCRYPTION_KEY environment variable is not set"

**原因**: 環境変数が設定されていない

**解決方法**:
1. `.env`ファイルに`ENCRYPTION_KEY`を追加
2. Vercelの環境変数に設定（本番環境）

### エラー: "Failed to decrypt data"

**原因**: 
- 暗号化キーが変更された
- データが破損している
- 暗号化されていないデータを復号化しようとしている

**解決方法**:
1. 暗号化キーが正しいか確認
2. データベースのデータを確認
3. 必要に応じて再認証（LINE/Googleカレンダー）

## ベストプラクティス

1. **キーの管理**
   - 本番環境と開発環境で異なるキーを使用
   - キーは環境変数で管理（コードに直接書かない）
   - 定期的なローテーションを検討

2. **ログ出力**
   - 暗号化されたデータをログに出力しない
   - エラーログにも機密情報を含めない

3. **アクセス制御**
   - 暗号化されたデータへのアクセスは認証済みユーザーのみ
   - 適切な権限管理を実装

4. **監査**
   - 機密情報へのアクセスをログに記録
   - 定期的なセキュリティ監査を実施
