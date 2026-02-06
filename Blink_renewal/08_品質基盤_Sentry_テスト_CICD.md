# 品質基盤: Sentry導入 + テスト基盤 + CI/CD

## 概要
プロダクション環境のエラー監視、テスト自動化、継続的インテグレーションの3本柱で品質基盤を構築する。

---

## 現状分析

### エラーモニタリング
- エラーハンドリングは `console.error` のみ（`server/src/index.ts:161`）
- フロントエンドのErrorBoundaryはUI表示のみで外部通知なし
- 本番環境でのエラー発生を把握する手段がゼロ

### テスト
- テストファイルが一切存在しない（`*.test.ts`, `*.spec.ts` ゼロ）
- テストフレームワーク未設定（package.jsonにvitest/jest等なし）
- ビルドは通るが、ロジックの正しさを検証する手段がない

### CI/CD
- `.github/workflows/` ディレクトリが存在しない
- デプロイはVercel連携の自動デプロイのみ（テスト・lint未実行）
- ESLint設定ファイル未整備（`07_refactor_uiux_mobile.md` で言及）

---

## 1. Sentry導入（P0）

### 1-1. フロントエンド

#### パッケージ追加
```bash
cd client && npm install @sentry/react
```

#### 初期化（`client/src/main.tsx`）
```typescript
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE, // 'development' | 'production'
  enabled: import.meta.env.PROD,
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1, // パフォーマンストレースは10%
  beforeSend(event) {
    // 開発環境ではコンソールに出力のみ
    if (import.meta.env.DEV) {
      console.error('[Sentry]', event)
      return null
    }
    return event
  },
})
```

#### ErrorBoundary連携
既存のErrorBoundaryがあれば `Sentry.withErrorBoundary` でラップ、
または `Sentry.ErrorBoundary` コンポーネントを使用。

```typescript
// App.tsx のルートで
import * as Sentry from '@sentry/react'

<Sentry.ErrorBoundary fallback={<ErrorFallback />}>
  <App />
</Sentry.ErrorBoundary>
```

#### ユーザーコンテキスト設定
`authStore.ts` のログイン成功時:
```typescript
import * as Sentry from '@sentry/react'

Sentry.setUser({
  id: staff.id.toString(),
  email: staff.email,
})
Sentry.setTag('store_id', staff.store_id.toString())
Sentry.setTag('is_owner', staff.is_owner.toString())
```

### 1-2. バックエンド

#### パッケージ追加
```bash
cd server && npm install @sentry/node
```

#### 初期化（`server/src/index.ts`）
```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL ? 'production' : 'development',
  enabled: !!process.env.VERCEL,
  tracesSampleRate: 0.1,
})

// Express appの初期化後、ルート登録前に:
Sentry.setupExpressErrorHandler(app)
```

#### エラーハンドラー更新（`server/src/index.ts:154-164`）
```typescript
app.use(
  (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    Sentry.captureException(err)
    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'サーバーエラーが発生しました' })
  },
)
```

### 1-3. ソースマップアップロード

#### Vite設定（`client/vite.config.ts`）
```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig({
  build: {
    sourcemap: true, // ← false から true に変更（ただし公開はしない）
  },
  plugins: [
    react(),
    sentryVitePlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: 'blink-pet',
      project: 'blink-frontend',
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'], // ビルド後にマップファイル削除
      },
    }),
  ],
})
```

### 1-4. 環境変数
```
# .env.local (フロントエンド)
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# .env (バックエンド)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx  # ソースマップアップロード用
```

---

## 2. テスト基盤（P1）

### 2-1. Vitest セットアップ

#### パッケージ追加
```bash
# ルートに共通設定
npm install -D vitest

# フロントエンド用
cd client && npm install -D @testing-library/react @testing-library/jest-dom jsdom

# バックエンド用
cd server && npm install -D supertest @types/supertest
```

#### Vitest設定（ルート `vitest.config.ts`）
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    workspace: [
      'client/vitest.config.ts',
      'server/vitest.config.ts',
    ],
  },
})
```

#### フロントエンド用（`client/vitest.config.ts`）
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

#### バックエンド用（`server/vitest.config.ts`）
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
})
```

### 2-2. クリティカルパステスト

#### 優先テスト対象

| テスト対象 | ファイル | テスト内容 |
|-----------|---------|-----------|
| 認証ミドルウェア | `server/src/middleware/auth.ts` | JWT検証、スタッフ取得、キャッシュ |
| レコードAPI | `server/src/routes/records.ts` | CRUD、業種別データ、バリデーション |
| 予約API | `server/src/routes/reservations.ts` | CRUD、ステータス遷移 |
| 業種切替ロジック | `client/src/components/BusinessTypeSwitcher.tsx` | フィルタリング動作 |
| AIフィードバック | `client/src/pages/records/hooks/useRecordAISuggestions.ts` | フィードバック送信 |

#### テスト例（`server/src/__tests__/records.test.ts`）
```typescript
import { describe, it, expect, vi } from 'vitest'
// API統合テストの基本構造

describe('Records API', () => {
  describe('POST /api/records', () => {
    it('should create a grooming record', async () => {
      // テスト実装
    })

    it('should validate required fields', async () => {
      // バリデーションテスト
    })

    it('should reject unauthorized access', async () => {
      // 認証テスト
    })
  })
})
```

### 2-3. テストスクリプト（`package.json`）
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 3. CI/CD（P1）

### 3-1. GitHub Actions（`.github/workflows/ci.yml`）

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: |
          cd client && npm ci
          cd ../server && npm ci

      - name: Type check (client)
        run: cd client && npx tsc --noEmit

      - name: Type check (server)
        run: cd server && npx tsc --noEmit

      - name: Build client
        run: cd client && npm run build

      - name: Build server
        run: cd server && npm run build

      - name: Run tests
        run: npm test
```

### 3-2. ESLint設定（将来的に）
現在ESLint設定が未整備（07計画で言及）。CI/CD導入後に段階的に追加。

---

## 対象ファイル

### バックエンド
| ファイル | 変更内容 |
|----------|----------|
| `server/src/index.ts` | Sentry初期化、errorHandler追加 |
| `server/package.json` | `@sentry/node`, `vitest`, `supertest` 追加 |
| 新規: `server/vitest.config.ts` | テスト設定 |
| 新規: `server/src/__tests__/` | テストファイル |

### フロントエンド
| ファイル | 変更内容 |
|----------|----------|
| `client/src/main.tsx` | Sentry初期化 |
| `client/vite.config.ts` | ソースマップ + Sentryプラグイン |
| `client/src/store/authStore.ts` | Sentryユーザーコンテキスト設定 |
| `client/package.json` | `@sentry/react`, テスト関連 追加 |
| 新規: `client/vitest.config.ts` | テスト設定 |
| 新規: `client/src/__tests__/` | テストファイル |

### プロジェクトルート
| ファイル | 変更内容 |
|----------|----------|
| 新規: `.github/workflows/ci.yml` | GitHub Actions |
| 新規: `vitest.config.ts` | ワークスペース設定 |
| `package.json` | テストスクリプト追加 |

---

## 検証チェックリスト

### Sentry
- [ ] フロントエンドで意図的にエラーを発生させ、Sentryダッシュボードに表示されること
- [ ] バックエンドで意図的にエラーを発生させ、Sentryダッシュボードに表示されること
- [ ] ソースマップが正しくアップロードされ、スタックトレースが読めること
- [ ] ユーザーコンテキスト（staff_id, store_id）がイベントに含まれること
- [ ] 開発環境ではSentryに送信されないこと

### テスト
- [ ] `npm test` でテストスイートが実行されること
- [ ] auth middleware のテストが通ること
- [ ] records API のテストが通ること
- [ ] フロントエンドのコンポーネントテストが通ること

### CI/CD
- [ ] PRを作成したときにGitHub Actionsが実行されること
- [ ] 型チェックが通ること
- [ ] ビルドが通ること
- [ ] テストが通ること

---

## 実装ステータス

- [ ] Sentry フロントエンド導入 📋
- [ ] Sentry バックエンド導入 📋
- [ ] Sentry ソースマップ設定 📋
- [ ] Vitest セットアップ 📋
- [ ] クリティカルパステスト作成 📋
- [ ] GitHub Actions 設定 📋
- [ ] ESLint 設定整備 📋
