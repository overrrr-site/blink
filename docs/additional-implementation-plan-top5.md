# 追加実装計画（上位5件）

- 作成日: 2026-02-10
- 対象プロダクト: Blink / pet-carte
- 前提: 会計データ連動はスコープ外（履歴出力/プリント対応で代替）

## 1. LIFF QRチェックアウト不整合の解消（P0）
- タイトル: `LIFFチェックイン/チェックアウトのQRトークン仕様を統一する`
- 背景:
  - `check-in` と `check-out` で検証する `qrData.type` が不一致で、チェックアウト失敗リスクがある。
  - 対象: `/Users/shota/Desktop/claude/pet-carte/server/src/routes/liff/checkin.ts`

### 実装スコープ
- QR発行時トークン仕様の統一（`type`）
- `POST /check-in`, `POST /check-out` のJWT検証条件統一
- LIFF側エラーハンドリング整備

### 実装タスク
1. `qr-code` 発行の `type` を単一仕様へ統一
2. `check-in`/`check-out` の検証条件を同一仕様に変更
3. エラーメッセージをケース別に整理（期限切れ/店舗不一致/型不一致）
4. 手動入力フォールバックでも同仕様で成功することを確認
5. APIテストを追加（正常系・不正トークン・他店舗トークン）

### 受け入れ条件
1. 同一店舗の有効QRで `check-in`/`check-out` が両方成功する
2. 他店舗QR、改ざんQR、期限切れQRで適切なエラーになる
3. 手動入力フォールバックでも同様に動作する

### 影響範囲
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/liff/checkin.ts`
- `/Users/shota/Desktop/claude/pet-carte/client/src/liff/pages/Home.tsx`

## 2. ホテル滞在ログの構造化（P0）
- タイトル: `ホテルカルテに時系列ケアログ（食事/投薬/排泄/散歩）を追加する`
- 背景:
  - `hotel_data` は宿泊情報中心で、滞在中の運用ログが構造化されていない。

### 実装スコープ
- `hotel_data.care_logs` の追加（例: `[{ at, category, note, staff }]`）
- 入力UI、保存、詳細表示（店舗/LIFF）
- 既存データ互換（未保持は空配列）

### 実装タスク
1. `care_logs` の型定義追加
2. HotelFormにログの追加/編集/削除UIを実装
3. 保存/取得APIのバリデーション追加
4. RecordDetailおよびLIFF詳細画面に時系列表示を追加
5. 既存レコード互換処理を実装

### 受け入れ条件
1. 4カテゴリ（食事/投薬/排泄/散歩）を記録できる
2. 時系列順で表示できる
3. 既存レコード表示でエラーが発生しない

### 影響範囲
- `/Users/shota/Desktop/claude/pet-carte/client/src/types/record.ts`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/records/components/HotelForm.tsx`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/records.ts`
- `/Users/shota/Desktop/claude/pet-carte/client/src/liff/pages/RecordDetail.tsx`

## 3. ホテルの部屋割り・在庫管理（P1）
- タイトル: `ホテル予約にルームアサインと空室制御を導入する`
- 背景:
  - 部屋割り管理がなく、受入超過・重複割り当てのリスクがある。

### 実装スコープ
- 部屋マスタ（部屋名/サイズ/有効フラグ）
- 予約への部屋ID紐付け
- 空室チェック・重複割当防止
- 予約UIでの部屋選択

### 実装タスク
1. 部屋マスタと予約紐付けのDBマイグレーション追加
2. 空室取得APIと重複割当防止ロジックを実装
3. ホテル予約作成画面に部屋選択UIを追加
4. 予約詳細画面に割当部屋表示を追加
5. 競合ケースを考慮したサーバー側防御を実装

### 受け入れ条件
1. 同時間帯で同一部屋の重複予約が不可
2. 空室のみ選択可能
3. 予約詳細で部屋情報を確認できる

### 影響範囲
- `/Users/shota/Desktop/claude/pet-carte/server/src/db/migrations/`（新規）
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/reservations.ts`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/HotelReservationCreate.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/ReservationDetail.tsx`

## 4. トリミング来店時カウンセリング必須化（P1）
- タイトル: `トリミング来店時確認項目をテンプレ化して必須入力にする`
- 背景:
  - 来店時の認識合わせが自由記述中心で、抜け漏れリスクがある。

### 実装スコープ
- 必須項目定義（希望スタイル、注意部位、当日懸念、同意確認）
- UIテンプレ実装
- 共有前バリデーションの追加

### 実装タスク
1. 必須項目のデータスキーマを定義
2. 来店時カウンセリングUI（テンプレ）を実装
3. 共有前バリデーションに必須項目チェックを追加
4. 未入力時エラー導線を実装
5. 過去データ互換を維持

### 受け入れ条件
1. 必須項目未入力で共有不可
2. 共有時に必須項目が保存される
3. 過去データ閲覧に影響しない

### 影響範囲
- `/Users/shota/Desktop/claude/pet-carte/client/src/liff/pages/PreVisitInput.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/RecordCreate.tsx`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/records.ts`

## 5. 履歴の出力/プリント対応（P2）
- タイトル: `カルテ・予約履歴のCSV出力と印刷ビューを実装する`
- 背景:
  - 会計連動は不要だが、記録提出・紙運用のため履歴出力が必要。

### 実装スコープ
- 対象: カルテ履歴、予約履歴
- 絞込: 期間、犬、業態、スタッフ
- 出力: CSV（BOM付き、日本語列名）
- 印刷: A4最適化ビュー（単票/一覧）
- ログ: 出力監査（誰が/いつ/何を）

### 実装タスク
1. 出力対象と列定義を決定
2. CSV出力APIを実装
3. 一覧画面にエクスポート導線を追加
4. 印刷用ビュー（`@media print`）を実装
5. 出力監査ログを保存

### 受け入れ条件
1. 条件指定でCSV出力できる
2. 一覧/詳細が印刷で崩れない
3. 3業態で同一導線で利用できる

### 影響範囲
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/RecordList.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/ReservationsCalendar.tsx`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/records.ts`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/reservations.ts`

## 実装優先順（推奨）
1. Issue 1: LIFF QRチェックアウト不整合の解消（P0）
2. Issue 2: ホテル滞在ログの構造化（P0）
3. Issue 4: トリミング来店時カウンセリング必須化（P1）
4. Issue 3: ホテルの部屋割り・在庫管理（P1）
5. Issue 5: 履歴の出力/プリント対応（P2）

## 補足
- 本計画は「追加実装計画」用であり、公開API互換性に影響する変更は各Issueで別途互換方針を明記すること。
- DB変更を含むIssueは、必ずマイグレーション・ロールバック方針・既存データ互換をセットでレビューすること。
