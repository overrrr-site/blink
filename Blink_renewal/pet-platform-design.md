# Blink リニューアル設計書

## 概要

犬の幼稚園向けSaaS「Blink」を、トリミングサロン・ペットホテルにも対応するマルチ業態プラットフォームへリニューアルする。

**方針**: 既存Blinkをフォークして拡張。動いているものは壊さない。

---

## 1. リニューアル方針

### やること

| 項目 | 内容 |
|------|------|
| 業態拡張 | 幼稚園 → 幼稚園 + トリミング + ホテル |
| カルテ統合 | 日誌（journals）→ カルテ（records）に汎用化 |
| UI刷新 | カルテ画面を業態別に最適化 |
| AI強化 | 写真分析、健康履歴分析、報告文生成 |

### やらないこと（初期）

| 項目 | 理由 |
|------|------|
| 既存journalsテーブルの廃止 | 既存モニター店舗に影響、後方互換維持 |
| 認証・課金の作り直し | 動いているので触らない |
| LINEミニアプリの大幅改修 | 段階的に対応 |

---

## 2. 業態定義

### 対応業態

| 業態 | record_type | カラー | 主な記録内容 |
|------|-------------|--------|-------------|
| トリミング | grooming | 紫 #8B5CF6 | カットスタイル、仕上がり写真、気になる箇所 |
| 幼稚園 | daycare | オレンジ #F97316 | 活動内容、トレーニング、様子 |
| ホテル | hotel | シアン #06B6D4 | 宿泊情報、日々の様子 |

### 店舗の業態設定

```typescript
// stores テーブル拡張
interface Store {
  id: string;
  name: string;
  business_types: ('grooming' | 'daycare' | 'hotel')[];  // 複数選択可
  primary_business_type: 'grooming' | 'daycare' | 'hotel';
  // ... 既存フィールド
}
```

---

## 3. カルテ（records）設計

### 既存journalsとの関係

```
journals（既存）        records（新規）
    ↓                      ↓
幼稚園の日誌専用    →    全業態対応の汎用カルテ

※ journalsは残して後方互換維持
※ 新規作成はrecordsに統一
※ 既存データは段階的に移行
```

### recordsテーブル

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
  grooming_data JSONB,   -- カットスタイル等
  daycare_data JSONB,    -- 活動・トレーニング等
  hotel_data JSONB,      -- 宿泊情報等
  
  -- 共通データ
  photos JSONB DEFAULT '{"regular": [], "concerns": []}',
  notes JSONB DEFAULT '{"internal_notes": null, "report_text": null}',
  condition JSONB,       -- 体調・様子
  health_check JSONB,    -- 健康チェック
  
  -- AI関連
  ai_generated_text TEXT,
  ai_suggestions JSONB,
  
  -- ステータス
  status TEXT DEFAULT 'draft',  -- 'draft' | 'saved' | 'shared'
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
```

### 業態固有データ構造

```typescript
// トリミング
interface GroomingData {
  selected_parts: string[];  // ['body', 'face', 'ears', ...]
  part_notes: Record<string, string>;  // { body: '10mm', face: 'テディベア' }
}

// 幼稚園（既存journalsと互換）
interface DaycareData {
  activities: string[];  // ['freeplay', 'training', 'walk', ...]
  training?: {
    items: Record<string, 'done' | 'almost' | 'not_done'>;
  };
  meal?: {
    morning: string;
    afternoon: string;
  };
  toilet?: {
    morning: { urination: boolean; defecation: boolean; location: string };
    afternoon: { urination: boolean; defecation: boolean; location: string };
  };
}

// ホテル
interface HotelData {
  check_in: string;
  check_out_scheduled: string;
  check_out_actual?: string;
  nights: number;
  special_care?: string;
  daily_notes?: Record<string, string>;  // { '2026-01-30': 'よく食べた' }
}
```

### 共通データ構造

```typescript
interface PhotosData {
  regular: Photo[];
  concerns?: ConcernPhoto[];  // トリミング時の気になる箇所
}

interface Photo {
  id: string;
  url: string;
  uploaded_at: string;
}

interface ConcernPhoto extends Photo {
  annotation?: { x: number; y: number };  // %座標
  label?: string;
}

interface NotesData {
  internal_notes?: string;  // 内部メモ（飼い主に非公開）
  report_text?: string;     // 飼い主への報告文
  ai_generated?: boolean;
}

interface ConditionData {
  overall: 'excellent' | 'good' | 'normal' | 'tired' | 'observe';
}

interface HealthCheckData {
  weight?: number;
  ears?: 'clean' | 'dirty' | 'red';
  nails?: 'normal' | 'long' | 'overgrown';
  skin?: 'good' | 'red' | 'rash';
  teeth?: 'good' | 'dirty' | 'tartar';
}
```

---

## 4. API設計

### 新規エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | `/api/records` | カルテ一覧 |
| GET | `/api/records/:id` | カルテ詳細 |
| POST | `/api/records` | カルテ作成 |
| PUT | `/api/records/:id` | カルテ更新 |
| DELETE | `/api/records/:id` | カルテ削除（論理） |
| POST | `/api/records/:id/share` | 飼い主に共有 |
| GET | `/api/dogs/:dogId/records/latest` | 最新カルテ（前回コピー用） |

### 写真エンドポイント

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/records/:id/photos` | 写真アップロード |
| DELETE | `/api/records/:id/photos/:photoId` | 写真削除 |

### AI エンドポイント（拡張）

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | `/api/ai/analyze-photo` | 写真分析（気になる箇所検出）★新規 |
| POST | `/api/ai/generate-report` | 報告文生成（業態対応）★拡張 |
| GET | `/api/ai/suggestions/:recordId` | 提案取得 ★新規 |

### 既存エンドポイント（維持）

| Endpoint | 対応 |
|----------|------|
| `/api/journals/*` | そのまま維持（後方互換） |
| `/api/reservations/*` | service_type追加 |
| `/api/dogs/*` | 変更なし |
| `/api/owners/*` | 変更なし |

---

## 5. AI生成プロンプト

### 業態別プロンプトテンプレート

```typescript
function buildReportPrompt(recordType: string, data: any): string {
  const baseInstruction = `
あなたはペット事業のスタッフです。
飼い主さんへの報告文を、温かみのある自然な日本語で書いてください。
150〜250文字程度で作成してください。
`;

  switch (recordType) {
    case 'grooming':
      return `${baseInstruction}
【業態】トリミングサロン
【カットスタイル】${formatPartNotes(data.grooming_data)}
【健康チェック】${formatHealthCheck(data.health_check)}
【スタッフメモ】${data.notes?.internal_notes || 'なし'}

注意事項：
- 仕上がりのポイントを具体的に
- 気になる箇所があれば丁寧に説明
- ホームケアのアドバイスを添えて
- 次回来店の目安があれば記載
`;

    case 'daycare':
      return `${baseInstruction}
【業態】犬の幼稚園
【今日の活動】${data.daycare_data?.activities?.join('、')}
【トレーニング】${formatTraining(data.daycare_data?.training)}
【体調】${data.condition?.overall}
【スタッフメモ】${data.notes?.internal_notes || 'なし'}

注意事項：
- 具体的なエピソードを入れて
- 成長や変化があれば触れる
- ポジティブな表現を心がけて
- 「もう少し」の項目は前向きに
`;

    case 'hotel':
      return `${baseInstruction}
【業態】ペットホテル
【宿泊日数】${data.hotel_data?.nights}泊
【食事・排泄】正常
【体調】${data.condition?.overall}
【スタッフメモ】${data.notes?.internal_notes || 'なし'}

注意事項：
- 滞在中の様子をまとめて
- 特に印象的だったエピソードを
- 安心感を与える表現で
- 「またのご利用をお待ちしています」で締める
`;
  }
}
```

### 写真分析プロンプト

```typescript
const photoAnalysisPrompt = `
この写真はペットサロンで撮影されたものです。
以下の観点で分析してください：

1. 仕上がりの状態（トリミングの場合）
2. 表情・様子
3. 気になる箇所の有無（皮膚の赤み、目やに、耳の汚れ等）

気になる箇所がある場合は、
- 箇所の名称
- 画像内の位置（左上/中央/右下など）
- 推奨するアクション
を回答してください。

JSON形式で回答：
{
  "concerns": [
    { "area": "耳", "position": "左上", "description": "赤みあり", "action": "獣医への相談を推奨" }
  ],
  "overall": "仕上がりの全体的な印象"
}
`;
```

---

## 6. フロントエンド設計

### ページ構成

```
/dashboard              既存（業態別に表示切替追加）
/reservations           既存（service_type対応）
/dogs                   既存
/dogs/:id               既存
/journals               既存（後方互換維持）
/journals/:id           既存（後方互換維持）
/records                新規（カルテ一覧）
/records/new            新規（カルテ作成）
/records/:id            新規（カルテ詳細・編集）
/settings               既存（業態設定追加）
```

### カルテ画面のコンポーネント構成

```
RecordPage
├── RecordHeader（戻る、ペット名、保存、共有）
├── PetInfoCard（ペット情報表示）
├── RequiredSection
│   ├── GroomingForm（トリミング時）
│   │   └── DogSilhouette + PartInputs
│   ├── DaycareForm（幼稚園時）
│   │   └── ActivityToggles + TrainingChecks
│   ├── HotelForm（ホテル時）
│   │   └── StayInfo + DailyNotes
│   ├── PhotosForm（共通）
│   │   └── RegularPhotos + ConcernPhotos
│   └── NotesForm（共通）
│       └── InternalMemo + ReportText + AIGenerate
├── OptionalSection
│   ├── ConditionForm（体調）
│   └── HealthCheckForm（健康チェック）
└── AISuggestion（提案表示）
```

### デザイントークン

```typescript
const colors = {
  // 業態別
  grooming: '#8B5CF6',      // 紫
  groomingLight: '#F5F3FF',
  daycare: '#F97316',       // オレンジ
  daycareLight: '#FFF7ED',
  hotel: '#06B6D4',         // シアン
  hotelLight: '#ECFEFF',
  
  // AI
  ai: '#6366F1',            // インディゴ
  aiLight: '#EEF2FF',
  
  // 共通（既存を維持）
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
};
```

---

## 7. 開発フェーズ

### Phase 1: 基盤構築（2週間）

| タスク | 詳細 |
|--------|------|
| DB拡張 | stores.business_types, records テーブル |
| 店舗設定UI | 業態選択画面 |
| records API | CRUD + 写真アップロード |
| 幼稚園カルテ | 既存journals互換でrecords作成 |

**ゴール**: 幼稚園のカルテがrecordsテーブルで動く

### Phase 2: トリミング対応（2週間）

| タスク | 詳細 |
|--------|------|
| カットスタイルUI | 犬シルエット + 部位入力 |
| 気になる箇所 | 写真アノテーション機能 |
| AI写真分析 | 皮膚・耳等の異常検出 |
| 報告文生成 | トリミング用プロンプト |

**ゴール**: トリミングサロンでパイロット開始

### Phase 3: ホテル対応（1週間）

| タスク | 詳細 |
|--------|------|
| 宿泊情報UI | チェックイン/アウト表示 |
| 日別メモ | 複数日の記録対応 |
| 報告文生成 | ホテル用プロンプト |

**ゴール**: ペットホテルでパイロット開始

### Phase 4: 統合・最適化（1週間）

| タスク | 詳細 |
|--------|------|
| ダッシュボード | 業態別の表示切替 |
| LINEミニアプリ | 業態別カルテ表示 |
| パフォーマンス | 自動保存、画像最適化 |

**ゴール**: 本番リリース

---

## 8. マイグレーション計画

### 既存データの扱い

```
Phase 1: 並行運用
  - journals: 既存データ、既存APIそのまま
  - records: 新規作成分から使用

Phase 2: 段階的移行
  - 新規カルテは全てrecordsに
  - 既存モニター店舗は任意でrecordsに切替

Phase 3: 完全移行（6ヶ月後目安）
  - journalsからrecordsへデータ移行
  - journals APIを廃止
```

### 移行スクリプト（将来用）

```sql
-- journals → records への移行
INSERT INTO records (
  store_id, dog_id, reservation_id, staff_id,
  record_type, record_date,
  daycare_data, photos, notes,
  ai_generated_text, status, shared_at,
  created_at, updated_at
)
SELECT 
  j.store_id, j.dog_id, j.reservation_id, j.staff_id,
  'daycare', j.journal_date,
  jsonb_build_object(
    'activities', j.activities,
    'training', j.training_data,
    'meal', j.meal_data,
    'toilet', jsonb_build_object(
      'morning', j.morning_toilet,
      'afternoon', j.afternoon_toilet
    )
  ),
  jsonb_build_object('regular', j.photos, 'concerns', '[]'::jsonb),
  jsonb_build_object('internal_notes', j.staff_notes, 'report_text', j.comment),
  j.ai_generated_comment,
  CASE WHEN j.shared_at IS NOT NULL THEN 'shared' ELSE 'saved' END,
  j.shared_at,
  j.created_at, j.updated_at
FROM journals j
WHERE j.deleted_at IS NULL;
```

---

## 9. リスクと対策

| リスク | 対策 |
|--------|------|
| 既存モニターへの影響 | journals APIを維持、段階的移行 |
| 開発遅延 | Phase 1の幼稚園互換を最優先 |
| UI複雑化 | 業態ごとに必要な項目だけ表示 |
| AI精度 | プロンプトを業態別に最適化 |

---

## 10. 成功指標

| 指標 | 目標 |
|------|------|
| 幼稚園カルテ作成時間 | 既存と同等以下 |
| トリミングカルテ作成時間 | 5分以内 |
| AI報告文の採用率 | 70%以上 |
| パイロット店舗満足度 | 4.0/5.0以上 |

---

*最終更新: 2026-01-30*
