# Blink リニューアル コンテキストパック

## 概要

既存の犬の幼稚園向けSaaS「Blink」を、マルチ業態（トリミング・幼稚園・ホテル）対応にリニューアルするための開発コンテキスト。

**方針**: 既存コードをフォークして拡張。動いているものは壊さない。

---

## 1. 既存技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | React 18 + TypeScript + Vite |
| 状態管理 | Zustand + SWR |
| スタイリング | Tailwind CSS |
| バックエンド | Node.js + Express |
| データベース | PostgreSQL (Supabase) |
| 認証 | JWT + LINE連携 |
| AI | Google Gemini API |
| ストレージ | Supabase Storage |
| 通知 | LINE Messaging API |
| 決済 | PAY.JP |
| ホスティング | Vercel |

---

## 2. ディレクトリ構成

```
pet-carte/
├── api/
│   └── index.ts                 # Vercel用エントリポイント
├── client/
│   ├── src/
│   │   ├── api/                 # API呼び出し
│   │   ├── components/          # 共通コンポーネント
│   │   ├── hooks/               # カスタムフック
│   │   ├── liff/                # LINEミニアプリ
│   │   ├── pages/               # ページコンポーネント
│   │   ├── store/               # Zustand
│   │   └── utils/
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── db/                  # DB接続、マイグレーション
│   │   ├── index.ts             # Express設定
│   │   ├── middleware/          # 認証等
│   │   ├── routes/              # APIルート ★拡張対象
│   │   │   ├── liff/            # LIFF用（分割済み）
│   │   │   └── ...
│   │   ├── services/            # ビジネスロジック
│   │   └── utils/
│   └── vercel.json
├── vercel.json
└── package.json
```

---

## 3. DB拡張

### 3.1 storesテーブル拡張

```sql
-- 既存storesテーブルに追加
ALTER TABLE stores ADD COLUMN IF NOT EXISTS 
  business_types TEXT[] DEFAULT ARRAY['daycare'];

ALTER TABLE stores ADD COLUMN IF NOT EXISTS 
  primary_business_type TEXT DEFAULT 'daycare';

-- 制約
ALTER TABLE stores ADD CONSTRAINT valid_primary_business_type 
  CHECK (primary_business_type IN ('grooming', 'daycare', 'hotel'));
```

### 3.2 reservationsテーブル拡張

```sql
-- 既存reservationsテーブルに追加
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS 
  service_type TEXT DEFAULT 'daycare';

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS 
  service_details JSONB;

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS 
  end_datetime TIMESTAMP;  -- ホテルのチェックアウト用

-- 制約
ALTER TABLE reservations ADD CONSTRAINT valid_service_type 
  CHECK (service_type IN ('grooming', 'daycare', 'hotel'));
```

### 3.3 recordsテーブル（新規）

```sql
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id),
  dog_id UUID NOT NULL REFERENCES dogs(id),
  reservation_id UUID REFERENCES reservations(id),
  staff_id UUID REFERENCES staff(id),
  
  -- 業態
  record_type TEXT NOT NULL,  -- 'grooming' | 'daycare' | 'hotel'
  record_date DATE NOT NULL,
  
  -- 業態固有データ（JSONB）
  grooming_data JSONB,
  daycare_data JSONB,
  hotel_data JSONB,
  
  -- 共通データ
  photos JSONB DEFAULT '{"regular": [], "concerns": []}',
  notes JSONB DEFAULT '{"internal_notes": null, "report_text": null}',
  condition JSONB,
  health_check JSONB,
  
  -- AI関連
  ai_generated_text TEXT,
  ai_suggestions JSONB,
  
  -- ステータス
  status TEXT DEFAULT 'draft',
  shared_at TIMESTAMP,
  
  -- メタ
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_record_type CHECK (record_type IN ('grooming', 'daycare', 'hotel'))
);

-- インデックス
CREATE INDEX idx_records_store_date ON records(store_id, record_date DESC);
CREATE INDEX idx_records_dog ON records(dog_id, record_date DESC);
CREATE INDEX idx_records_reservation ON records(reservation_id);
```

---

## 4. 既存実装パターン

### 4.1 マルチテナント

全てのクエリで `store_id` によるフィルタリングを行う。

```typescript
// 認証ミドルウェア
export interface AuthRequest extends Request {
  storeId?: number;
  userId?: number;
}

// ルートでの使用
router.get('/', async (req: AuthRequest, res) => {
  const { storeId } = req;
  const result = await pool.query(
    'SELECT * FROM records WHERE store_id = $1 AND deleted_at IS NULL',
    [storeId]
  );
  res.json(result.rows);
});
```

### 4.2 論理削除

```typescript
// 削除
await pool.query(
  'UPDATE records SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
  [id]
);

// 取得時
'WHERE deleted_at IS NULL'
```

### 4.3 ページネーション

```typescript
import { buildPaginatedResponse, parsePaginationParams } from '../utils/pagination.js';

router.get('/', async (req: AuthRequest, res) => {
  const pagination = parsePaginationParams(req.query);
  
  const result = await pool.query(`
    SELECT *, COUNT(*) OVER() as total_count
    FROM records
    WHERE store_id = $1 AND deleted_at IS NULL
    ORDER BY record_date DESC
    LIMIT $2 OFFSET $3
  `, [req.storeId, pagination.limit, pagination.offset]);
  
  const total = result.rows[0]?.total_count || 0;
  res.json(buildPaginatedResponse(result.rows, total, pagination));
});
```

### 4.4 レスポンスユーティリティ

```typescript
import { 
  sendBadRequest, 
  sendNotFound, 
  sendServerError 
} from '../utils/response.js';

// 使用例
if (!id) {
  sendBadRequest(res, 'IDが必要です');
  return;
}
```

### 4.5 写真アップロード

```typescript
import { uploadBase64ToSupabaseStorage } from '../services/storageService.js';

// Base64 → Supabase Storage
const photoUrl = await uploadBase64ToSupabaseStorage(
  base64Data,
  `records/${recordId}`,
  `photo_${Date.now()}.jpg`
);
```

---

## 5. 既存AI実装

### 5.1 Gemini API呼び出し

```typescript
// server/src/routes/ai.ts より

const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  }
);

// レスポンス抽出
function extractGeminiText(data: unknown): string {
  // candidates[0].content.parts[0].text を取得
}
```

### 5.2 写真分析（Vision）

```typescript
const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      }],
      generationConfig: {
        maxOutputTokens: 500,
        temperature: 0.7,
      },
    }),
  }
);
```

---

## 6. 新規API実装

### 6.1 records ルート

```typescript
// server/src/routes/records.ts

import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import pool from '../db/connection.js';
import { sendBadRequest, sendNotFound, sendServerError } from '../utils/response.js';
import { buildPaginatedResponse, parsePaginationParams } from '../utils/pagination.js';

const router = express.Router();
router.use(authenticate);

// 一覧取得
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { storeId } = req;
    const { record_type, dog_id } = req.query;
    const pagination = parsePaginationParams(req.query);
    
    let query = `
      SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
             COUNT(*) OVER() as total_count
      FROM records r
      JOIN dogs d ON r.dog_id = d.id
      WHERE r.store_id = $1 AND r.deleted_at IS NULL
    `;
    const params: any[] = [storeId];
    
    if (record_type) {
      params.push(record_type);
      query += ` AND r.record_type = $${params.length}`;
    }
    
    if (dog_id) {
      params.push(dog_id);
      query += ` AND r.dog_id = $${params.length}`;
    }
    
    query += ` ORDER BY r.record_date DESC, r.created_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);
    
    const result = await pool.query(query, params);
    const total = result.rows[0]?.total_count || 0;
    res.json(buildPaginatedResponse(result.rows, total, pagination));
  } catch (error) {
    sendServerError(res, 'カルテ一覧の取得に失敗しました', error);
  }
});

// 詳細取得
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { storeId } = req;
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT r.*, d.name as dog_name, d.photo_url as dog_photo,
             d.breed, d.birth_date,
             o.name as owner_name
      FROM records r
      JOIN dogs d ON r.dog_id = d.id
      JOIN owners o ON d.owner_id = o.id
      WHERE r.id = $1 AND r.store_id = $2 AND r.deleted_at IS NULL
    `, [id, storeId]);
    
    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテの取得に失敗しました', error);
  }
});

// 作成
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { storeId, userId } = req;
    const {
      dog_id,
      reservation_id,
      record_type,
      record_date,
      grooming_data,
      daycare_data,
      hotel_data,
      photos,
      notes,
      condition,
      health_check,
    } = req.body;
    
    if (!dog_id || !record_type || !record_date) {
      sendBadRequest(res, '必須項目が不足しています');
      return;
    }
    
    const result = await pool.query(`
      INSERT INTO records (
        store_id, dog_id, reservation_id, staff_id,
        record_type, record_date,
        grooming_data, daycare_data, hotel_data,
        photos, notes, condition, health_check
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      storeId, dog_id, reservation_id, userId,
      record_type, record_date,
      grooming_data ? JSON.stringify(grooming_data) : null,
      daycare_data ? JSON.stringify(daycare_data) : null,
      hotel_data ? JSON.stringify(hotel_data) : null,
      JSON.stringify(photos || { regular: [], concerns: [] }),
      JSON.stringify(notes || {}),
      condition ? JSON.stringify(condition) : null,
      health_check ? JSON.stringify(health_check) : null,
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテの作成に失敗しました', error);
  }
});

// 更新
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { storeId } = req;
    const { id } = req.params;
    const updates = req.body;
    
    // 更新可能フィールド
    const allowedFields = [
      'grooming_data', 'daycare_data', 'hotel_data',
      'photos', 'notes', 'condition', 'health_check',
      'ai_generated_text', 'status'
    ];
    
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramIndex}`);
        values.push(
          typeof updates[field] === 'object' 
            ? JSON.stringify(updates[field]) 
            : updates[field]
        );
        paramIndex++;
      }
    }
    
    if (setClauses.length === 0) {
      sendBadRequest(res, '更新する項目がありません');
      return;
    }
    
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    
    values.push(id, storeId);
    const result = await pool.query(`
      UPDATE records 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex} AND store_id = $${paramIndex + 1} AND deleted_at IS NULL
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, 'カルテの更新に失敗しました', error);
  }
});

// 共有
router.post('/:id/share', async (req: AuthRequest, res) => {
  try {
    const { storeId } = req;
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE records 
      SET status = 'shared', shared_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
      RETURNING *
    `, [id, storeId]);
    
    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }
    
    // TODO: LINE通知送信
    
    res.json({ message: '共有しました', record: result.rows[0] });
  } catch (error) {
    sendServerError(res, '共有に失敗しました', error);
  }
});

// 削除
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { storeId } = req;
    const { id } = req.params;
    
    const result = await pool.query(`
      UPDATE records 
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL
      RETURNING id
    `, [id, storeId]);
    
    if (result.rows.length === 0) {
      sendNotFound(res, 'カルテが見つかりません');
      return;
    }
    
    res.json({ message: '削除しました' });
  } catch (error) {
    sendServerError(res, '削除に失敗しました', error);
  }
});

// 最新カルテ取得（前回コピー用）
router.get('/dogs/:dogId/latest', async (req: AuthRequest, res) => {
  try {
    const { storeId } = req;
    const { dogId } = req.params;
    const { record_type } = req.query;
    
    let query = `
      SELECT * FROM records
      WHERE dog_id = $1 AND store_id = $2 AND deleted_at IS NULL
    `;
    const params: any[] = [dogId, storeId];
    
    if (record_type) {
      params.push(record_type);
      query += ` AND record_type = $${params.length}`;
    }
    
    query += ` ORDER BY record_date DESC LIMIT 1`;
    
    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      res.json(null);
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    sendServerError(res, '最新カルテの取得に失敗しました', error);
  }
});

export default router;
```

### 6.2 index.tsへの登録

```typescript
// server/src/index.ts に追加

import recordsRoutes from './routes/records.js';

// 既存のルート登録の後に追加
app.use('/api/records', recordsRoutes);
```

---

## 7. AI生成の拡張

### 7.1 業態別レポート生成

```typescript
// server/src/routes/ai.ts に追加

// 業態別レポート生成
router.post('/generate-report', async (req: AuthRequest, res) => {
  try {
    const {
      record_type,
      dog_name,
      grooming_data,
      daycare_data,
      hotel_data,
      photos,
      condition,
      health_check,
      internal_notes,
    } = req.body;
    
    const prompt = buildReportPrompt(record_type, {
      dog_name,
      grooming_data,
      daycare_data,
      hotel_data,
      photos,
      condition,
      health_check,
      internal_notes,
    });
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      sendServerError(res, 'AI機能が利用できません', new Error('Missing API key'));
      return;
    }
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.7,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
    
    const data = await response.json();
    const generatedText = extractGeminiText(data);
    
    res.json({ report: generatedText });
  } catch (error) {
    sendServerError(res, 'レポート生成に失敗しました', error);
  }
});

function buildReportPrompt(recordType: string, data: any): string {
  const baseInstruction = `
あなたはペット事業のスタッフです。
飼い主さんへの報告文を、温かみのある自然な日本語で書いてください。
150〜250文字程度で作成してください。
絵文字は1〜2個程度に抑えてください。
`;

  switch (recordType) {
    case 'grooming':
      return `${baseInstruction}
【業態】トリミングサロン
【ペット名】${data.dog_name}
【カットスタイル】${formatGroomingParts(data.grooming_data)}
【健康チェック】${formatHealthCheck(data.health_check)}
【スタッフメモ】${data.internal_notes || 'なし'}

注意事項：
- 仕上がりのポイントを具体的に伝える
- 気になる箇所があれば丁寧に説明
- ホームケアのアドバイスを添えて
- 次回来店の目安があれば記載
`;

    case 'daycare':
      return `${baseInstruction}
【業態】犬の幼稚園
【ペット名】${data.dog_name}
【今日の活動】${data.daycare_data?.activities?.join('、') || '記録なし'}
【トレーニング】${formatTraining(data.daycare_data?.training)}
【体調】${formatCondition(data.condition)}
【スタッフメモ】${data.internal_notes || 'なし'}

注意事項：
- 具体的なエピソードを入れる
- 成長や変化があれば触れる
- ポジティブな表現を心がける
- 「もう少し」の項目は前向きに表現
`;

    case 'hotel':
      return `${baseInstruction}
【業態】ペットホテル
【ペット名】${data.dog_name}
【宿泊日数】${data.hotel_data?.nights || 1}泊
【体調】${formatCondition(data.condition)}
【スタッフメモ】${data.internal_notes || 'なし'}

注意事項：
- 滞在中の様子をまとめる
- 印象的だったエピソードを入れる
- 安心感を与える表現で
- 「またのご利用をお待ちしています」で締める
`;

    default:
      return baseInstruction;
  }
}

function formatGroomingParts(data: any): string {
  if (!data?.part_notes) return '記録なし';
  return Object.entries(data.part_notes)
    .map(([part, note]) => `${part}: ${note}`)
    .join(', ');
}

function formatTraining(training: any): string {
  if (!training?.items) return '記録なし';
  const done = Object.entries(training.items)
    .filter(([, v]) => v === 'done')
    .map(([k]) => k);
  const almost = Object.entries(training.items)
    .filter(([, v]) => v === 'almost')
    .map(([k]) => k);
  
  let result = '';
  if (done.length) result += `できた: ${done.join(', ')}`;
  if (almost.length) result += ` / もう少し: ${almost.join(', ')}`;
  return result || '記録なし';
}

function formatCondition(condition: any): string {
  const labels: Record<string, string> = {
    excellent: '絶好調',
    good: '元気',
    normal: '普通',
    tired: '疲れ気味',
    observe: '要観察',
  };
  return labels[condition?.overall] || '記録なし';
}

function formatHealthCheck(health: any): string {
  if (!health) return '記録なし';
  const items = [];
  if (health.weight) items.push(`体重: ${health.weight}kg`);
  if (health.ears) items.push(`耳: ${health.ears}`);
  if (health.skin) items.push(`皮膚: ${health.skin}`);
  return items.join(', ') || '異常なし';
}
```

---

## 8. フロントエンド実装ガイド

### 8.1 カルテページのファイル構成

```
client/src/pages/records/
├── RecordList.tsx          # カルテ一覧
├── RecordCreate.tsx        # カルテ作成
├── RecordDetail.tsx        # カルテ詳細・編集
└── components/
    ├── RecordHeader.tsx    # ヘッダー（戻る、保存、共有）
    ├── PetInfoCard.tsx     # ペット情報表示
    ├── RequiredSection.tsx # 必須セクションラッパー
    ├── OptionalSection.tsx # 任意セクションラッパー
    ├── GroomingForm.tsx    # トリミング用フォーム
    ├── DaycareForm.tsx     # 幼稚園用フォーム
    ├── HotelForm.tsx       # ホテル用フォーム
    ├── PhotosForm.tsx      # 写真フォーム（共通）
    ├── NotesForm.tsx       # メモ・報告文（共通）
    ├── ConditionForm.tsx   # 体調（共通）
    ├── HealthCheckForm.tsx # 健康チェック（共通）
    └── AISuggestion.tsx    # AI提案表示
```

### 8.2 業態別カラー

```typescript
// client/src/utils/businessTypeColors.ts

export const businessTypeColors = {
  grooming: {
    primary: '#8B5CF6',
    light: '#F5F3FF',
    pale: '#FAF5FF',
  },
  daycare: {
    primary: '#F97316',
    light: '#FFF7ED',
    pale: '#FFFAF5',
  },
  hotel: {
    primary: '#06B6D4',
    light: '#ECFEFF',
    pale: '#F0FDFF',
  },
};

export function getBusinessTypeColor(type: string) {
  return businessTypeColors[type as keyof typeof businessTypeColors] 
    || businessTypeColors.daycare;
}
```

### 8.3 API呼び出し

```typescript
// client/src/api/records.ts

import { api } from './client';

export const recordsApi = {
  list: (params?: { record_type?: string; dog_id?: string }) =>
    api.get('/records', { params }),
  
  get: (id: string) =>
    api.get(`/records/${id}`),
  
  create: (data: CreateRecordInput) =>
    api.post('/records', data),
  
  update: (id: string, data: UpdateRecordInput) =>
    api.put(`/records/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/records/${id}`),
  
  share: (id: string) =>
    api.post(`/records/${id}/share`),
  
  getLatest: (dogId: string, recordType?: string) =>
    api.get(`/records/dogs/${dogId}/latest`, { 
      params: { record_type: recordType } 
    }),
};

export const aiApi = {
  generateReport: (data: GenerateReportInput) =>
    api.post('/ai/generate-report', data),
  
  analyzePhoto: (data: { photo_base64: string; dog_name?: string }) =>
    api.post('/ai/analyze-photo', data),
};
```

---

## 9. 参考：既存ファイル

### 流用すべき既存コード

| ファイル | 流用内容 |
|----------|----------|
| server/src/routes/dogs.ts | CRUD + N+1対策パターン |
| server/src/routes/journals.ts | 写真処理 + AI生成 + 通知 |
| server/src/routes/ai.ts | Gemini呼び出し + プロンプト構造 |
| server/src/routes/liff/index.ts | ルーター分割パターン |
| server/src/middleware/auth.ts | 認証ミドルウェア |
| server/src/utils/pagination.ts | ページネーション |
| server/src/utils/response.ts | レスポンスヘルパー |
| server/src/services/storageService.ts | 写真アップロード |
| server/src/services/lineFlexMessages.ts | LINE通知テンプレート |

### 既存journalsとの関係

```
journals（既存）
  ↓ そのまま維持（後方互換）
  ↓ 既存モニター店舗は引き続き使用

records（新規）
  ↓ 新規カルテ作成はこちら
  ↓ 全業態対応

将来的にjournals → recordsへ移行
```

---

## 10. 開発チェックリスト

### Phase 1: 基盤

- [ ] storesテーブル拡張（business_types）
- [ ] reservationsテーブル拡張（service_type）
- [ ] recordsテーブル作成
- [ ] records APIルート作成
- [ ] server/src/index.tsにルート登録
- [ ] 店舗設定UI（業態選択）

### Phase 2: トリミング

- [ ] GroomingForm コンポーネント
- [ ] 犬シルエット + 部位選択UI
- [ ] 気になる箇所（写真アノテーション）
- [ ] AI写真分析エンドポイント
- [ ] トリミング用レポート生成

### Phase 3: ホテル

- [ ] HotelForm コンポーネント
- [ ] 宿泊情報表示UI
- [ ] 日別メモ機能
- [ ] ホテル用レポート生成

### Phase 4: 統合

- [ ] ダッシュボード業態切替
- [ ] LIFF カルテ表示対応
- [ ] LINE通知テンプレート追加
- [ ] 自動保存機能

---

*最終更新: 2026-01-30*
