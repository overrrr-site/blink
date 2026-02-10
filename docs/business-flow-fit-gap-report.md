# 業態適合ギャップ調査レポート（犬の幼稚園・トリミングサロン・ペットホテル）

- 作成日: 2026-02-10
- 対象プロダクト: Blink / pet-carte（ローカル実装）
- 評価軸: 実務運用のみ
- 判定基準: 標準業務一式

## 1. 調査目的・スコープ
本レポートは、現行機能と3業態（犬の幼稚園・トリミングサロン・ペットホテル）の標準業務フローを突合し、以下を明確化することを目的とする。

- 必要機能の不足（未対応/部分対応）
- 機能過多（標準業務に対して運用負荷が高い）
- 業態別の優先改善項目

対象範囲:
- 予約、チェックイン/チェックアウト、カルテ/連絡帳、料金/契約、LIFF、通知、設定、AI支援
- 実装根拠はコード/DB/UIの一次情報を使用
- 法令深掘りは対象外（実務運用中心）

## 2. 現状機能一覧（実装根拠付き）

| 区分 | 現状機能 | 判定 | 主な実装根拠 |
|---|---|---|---|
| 業態管理 | `daycare`/`grooming`/`hotel` の3業態切替 | 対応済み | `client/src/domain/businessTypeConfig.ts`, `server/src/utils/businessTypes.ts` |
| 予約管理 | 日次/月次予約取得、作成/更新/削除、業態フィルタ | 対応済み | `server/src/routes/reservations.ts`, `client/src/pages/ReservationsCalendar.tsx` |
| 業態別予約UI | 幼稚園/トリミング/ホテルの作成フォーム分岐 | 対応済み | `client/src/pages/ReservationCreate.tsx`, `client/src/pages/GroomingReservationCreate.tsx`, `client/src/pages/HotelReservationCreate.tsx` |
| 事前入力（飼い主） | LIFFで業態別事前入力（幼稚園/トリミング/ホテル） | 対応済み | `client/src/liff/pages/PreVisitInput.tsx`, `server/src/routes/liff/preVisitInputs.ts` |
| チェックイン | LIFF QRスキャンでチェックイン更新 | 対応済み | `server/src/routes/liff/checkin.ts` (`/check-in`) |
| チェックアウト | LIFF QRスキャンでチェックアウト | 部分対応 | `server/src/routes/liff/checkin.ts` (`/check-out`) |
| カルテ | 3業態共通レコード + 業態別JSONデータ | 対応済み | `server/src/db/migrations/025_records_table.sql`, `server/src/routes/records.ts` |
| カルテ入力UI | 幼稚園活動/トイレ、トリミング部位、ホテル宿泊情報 | 対応済み | `client/src/pages/records/components/DaycareForm.tsx`, `.../GroomingForm.tsx`, `.../HotelForm.tsx` |
| 飼い主共有 | カルテ共有API（`shared`化） | 対応済み | `server/src/routes/records.ts` (`POST /:id/share`) |
| 顧客・犬情報 | 飼い主/犬、健康、性格、ワクチン情報管理 | 対応済み | `server/src/db/migrations/001_initial_schema.sql`, `client/src/pages/DogEdit.tsx` |
| 契約・回数券 | 月謝/チケット/単発、残回数管理 | 対応済み | `server/src/routes/contracts.ts`, `server/src/db/migrations/001_initial_schema.sql` |
| 料金マスタ | コース、トリミングメニュー、ホテル料金 | 対応済み | `client/src/pages/settings/PricingTab.tsx`, `server/src/routes/hotelPrices.ts` |
| 店舗設定 | 受入頭数、業態別設定（トリミング時間/ホテル設定） | 対応済み | `server/src/routes/storeSettings.ts`, `client/src/pages/settings/StoreTab.tsx` |
| 通知 | 通知設定、LINE通知テスト・状態確認 | 対応済み | `server/src/routes/notifications.ts` |
| 外部連携 | Googleカレンダー同期、LINE連携、PAY.JP（SaaS課金） | 対応済み | `server/src/services/reservationsService.ts`, `server/src/routes/billing.ts` |
| AI支援 | AIコメント生成、提案、写真解析連携 | 対応済み | `client/src/pages/records/hooks/useRecordAISuggestions.ts`, `server/src/services/aiService.ts` |

補足:
- 決済機能は「店舗のSaaS課金（PAY.JP）」であり、来店ごとの役務会計処理ではない（`server/src/routes/billing.ts`）。

## 3. 業態別の標準業務フロー（外部調査）

### 3.1 犬の幼稚園（デイケア）
標準的な流れ（共通化）:
1. 予約受付
2. 事前確認（体調・食事・排泄・注意点）
3. 来店時受付（当日体調確認）
4. サービス中記録（活動/トレーニング/排泄/食事）
5. 引き渡し（当日報告）
6. 次回提案・予約

調査ソースでは、体調・食事・排泄の事前共有、日中活動の報告、送迎/引き渡し時の連絡が共通要素。

### 3.2 トリミングサロン
標準的な流れ（共通化）:
1. 予約受付（メニュー・時間帯）
2. 事前確認（スタイル要望、体調、注意部位）
3. 来店時カウンセリング（仕上がり認識合わせ）
4. 施術記録（実施部位、肌/耳/爪など状態、写真）
5. 引き渡し/会計（施術説明、注意点、物販/次回提案）
6. アフターフォロー・次回予約

調査ソースでは、来店前カウンセリング、当日状態確認、施術後説明と次回予約提案が共通要素。

### 3.3 ペットホテル
標準的な流れ（共通化）:
1. 予約受付（泊数、犬種/サイズ、受入可否）
2. 事前確認（ワクチン証明、食事、投薬、散歩、緊急連絡先）
3. チェックイン（持ち物確認、同意事項確認）
4. 滞在中記録（食事/排泄/散歩/投薬/体調）
5. チェックアウト/精算
6. 宿泊後フォロー・次回予約

調査ソースでは、ワクチン証明提示、持参物とケア指示確認、滞在中の記録共有が共通要素。

## 4. フロー×機能マッピング表

### 4.1 犬の幼稚園

| フロー工程 | 現状機能 | 判定 | 根拠 |
|---|---|---|---|
| 予約受付 | 予約作成/カレンダー/業態フィルタ | 対応済み | `server/src/routes/reservations.ts`, `client/src/pages/ReservationCreate.tsx` |
| 事前確認 | LIFF事前入力（排泄・食事・体調・メモ） | 対応済み | `client/src/liff/pages/PreVisitInput.tsx`, `server/src/routes/liff/preVisitInputs.ts` |
| 来店時受付 | QRチェックイン | 対応済み | `server/src/routes/liff/checkin.ts` |
| サービス中記録 | Daycareカルテ（活動/食事/トイレ） | 対応済み | `client/src/pages/records/components/DaycareForm.tsx` |
| 引き渡し/会計 | カルテ共有は可能、役務会計は弱い | 部分対応 | `server/src/routes/records.ts`, `server/src/routes/billing.ts` |
| 次回予約 | 予約画面で実施可能 | 対応済み | `client/src/pages/ReservationsCalendar.tsx` |

### 4.2 トリミングサロン

| フロー工程 | 現状機能 | 判定 | 根拠 |
|---|---|---|---|
| 予約受付 | トリミング専用予約（時間・施術時間） | 対応済み | `client/src/pages/GroomingReservationCreate.tsx` |
| 事前確認 | LIFFで要望/懸念部位入力 | 対応済み | `client/src/liff/pages/PreVisitInput.tsx` |
| 来店時受付 | 来店チェックイン導線は共通で有 | 部分対応 | `server/src/routes/liff/checkin.ts` |
| サービス中記録 | 部位選択+部位メモ、写真、健康チェック | 対応済み | `client/src/pages/records/components/GroomingForm.tsx`, `.../HealthCheckForm.tsx` |
| 引き渡し/会計 | 施術説明の共有は可、会計連動は弱い | 部分対応 | `server/src/routes/records.ts`, `server/src/routes/billing.ts` |
| 次回予約 | カレンダーから予約可能 | 対応済み | `client/src/pages/ReservationsCalendar.tsx` |

### 4.3 ペットホテル

| フロー工程 | 現状機能 | 判定 | 根拠 |
|---|---|---|---|
| 予約受付 | ホテル専用予約（チェックイン/アウト予定） | 対応済み | `client/src/pages/HotelReservationCreate.tsx` |
| 事前確認 | LIFFで給餌/投薬/散歩/睡眠/緊急連絡確認 | 対応済み | `client/src/liff/pages/PreVisitInput.tsx` |
| チェックイン | QRチェックイン | 対応済み | `server/src/routes/liff/checkin.ts` |
| 滞在中記録 | 宿泊情報・特記事項・daily_notes（最小） | 部分対応 | `client/src/types/record.ts`, `client/src/pages/records/components/HotelForm.tsx` |
| チェックアウト/会計 | チェックアウトAPIありだが運用上不整合 | 部分対応 | `server/src/routes/liff/checkin.ts` |
| 次回予約 | 予約作成可能 | 対応済み | `client/src/pages/ReservationsCalendar.tsx` |

## 5. 不足機能一覧（優先度/影響度/根拠）

| No | 業態 | フロー工程 | 現状 | 影響 | 優先度 | 推奨対応 |
|---|---|---|---|---|---|---|
| 1 | 全業態（特にホテル） | チェックアウト | QRトークン種別の整合が取れておらず、運用で詰まる可能性 | 当日オペ停止、手作業化 | 高 | `check-in`/`check-out` のQRトークン仕様を統一しE2Eテスト追加（短期） |
| 2 | ペットホテル | 滞在中記録 | 日次ケア記録が自由記述中心で、タスク化不足 | 記録漏れ、引継ぎミス | 高 | 食事/投薬/散歩/排泄の時系列ログを構造化（短期） |
| 3 | ペットホテル | 宿泊運用 | 部屋割り/ケージ割当・稼働管理がない | 過剰受入/調整ミス | 高 | ルームアサインと在庫管理（部屋数上限連動）を追加（中期） |
| 4 | トリミング | 来店時受付 | 来店時チェックリスト（同意/皮膚状態/注意事項）が弱い | 仕上がり認識ズレ、クレーム | 中 | 来店時カウンセリング項目を固定化し記録必須化（短期） |
| 5 | トリミング | 会計連動 | 施術メニュー/オプションと会計の自動連動が弱い | 会計手入力、請求漏れ | 中 | 予約・施術・金額の一貫データ化（中期） |
| 6 | 幼稚園 | 引き渡し | 当日の引き渡しチェック（持ち物返却/伝達確認）がUI化されていない | 伝達漏れ、再問合せ増 | 中 | 引き渡しチェックリスト追加（短期） |
| 7 | 全業態 | 業務KPI | 受入率/再来率/キャンセル率など運用KPI可視化が限定的 | 改善施策が属人化 | 中 | 業態別KPIダッシュボード拡充（中期） |

## 6. 過多機能一覧（利用想定/維持コスト/簡素化案）

| 機能名 | 乖離ポイント | 維持コスト/運用負荷 | 判定 | 簡素化案 |
|---|---|---|---|---|
| 高度AI設定（複数トグル） | 小規模店舗では設定理解コストが高い | 説明/サポート負荷 | 過剰（中） | 「標準ON + 詳細設定折りたたみ」に集約 |
| 業態横断で同一項目を大量表示する設定UI | 業態固有で不要項目が混ざる | 設定ミス・学習負荷 | 過剰（中） | 業態別プリセットで段階表示 |
| レコード項目の柔軟性が高すぎる自由記述領域 | 現場で記録品質がばらつく | 後追い確認コスト | 過剰（低） | 必須チェック項目を増やし自由記述は補助化 |

## 7. 業態別改善優先ロードマップ（短期/中期）

### 7.1 犬の幼稚園
- 短期
  - 引き渡し時のチェックリスト実装（返却物・伝達事項）
  - 連絡帳共有時の必須入力バリデーション見直し
- 中期
  - 回数券消化の可視化強化（予定/実績差分）
  - KPI（登園率・欠席率・再来率）ダッシュボード

### 7.2 トリミングサロン
- 短期
  - 来店時カウンセリング項目をテンプレ化（同意・注意部位・希望）
  - 施術完了時の説明テンプレ/注意点テンプレ実装
- 中期
  - メニュー/オプション/所要時間/会計の一貫管理
  - スタッフ別の施術実績・再来率可視化

### 7.3 ペットホテル
- 短期
  - チェックアウト導線の不整合修正（QRトークン仕様統一）
  - 日次ケアログ（食事/投薬/排泄/散歩）を構造化
- 中期
  - ルームアサイン・稼働率管理
  - 長期滞在向けの定時タスク/アラート運用

## 8. まず着手すべき上位5件
1. QRチェックアウト不整合の解消（業務停止リスクが最も高い）
2. ホテル滞在中ログの構造化（食事/投薬/排泄/散歩）
3. ホテルの部屋割り・在庫管理機能
4. トリミング来店時カウンセリングのテンプレ化・必須化
5. 施術/宿泊データと会計データの連動強化

## 9. 検証シナリオ（品質担保）
1. 幼稚園: 予約→事前入力→チェックイン→連絡帳作成→共有→降園
2. トリミング: 予約（施術時間）→来店→施術記録→写真/申し送り→引渡し
3. ホテル: 予約（泊数/予定）→チェックイン→滞在記録→チェックアウト
4. 各シナリオで UI項目 ↔ DB保存先 ↔ API経路 が追跡可能であること

---

## 外部調査ソース（業務フロー）
- iPet損保「トリマーの仕事内容を解説」: https://www.ipet-ins.com/pedia/trimmer/9749/
- イオンペット トリマー育成ページ（業務紹介）: https://school.aeonpet.com/feature/trimmer-work/
- Dstyle 柏（幼稚園の1日の流れ）: https://www.dstyle-kashiwa.com/after/
- LA nature（犬の幼稚園の流れ）: https://www.lanature.jp/daycare
- PetPlus ペットホテル（利用時案内）: https://www.ahb.jpn.com/hotel/
- Coo&RIKU ペットホテル（預かり時の案内）: https://www.pet-coo.com/hotel/
- クローバー動物病院 ペットホテル（持参物/利用条件）: https://www.cloverpetclinic.com/pethotel
- ペットライン「犬のペットホテル利用準備」: https://www.petline.co.jp/note/catanddog/000141/

## 参照した主要実装ソース
- `/Users/shota/Desktop/claude/pet-carte/README.md`
- `/Users/shota/Desktop/claude/pet-carte/client/src/App.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/RecordCreate.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/records/components/DaycareForm.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/records/components/GroomingForm.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/records/components/HotelForm.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/GroomingReservationCreate.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/pages/HotelReservationCreate.tsx`
- `/Users/shota/Desktop/claude/pet-carte/client/src/liff/pages/PreVisitInput.tsx`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/reservations.ts`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/records.ts`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/liff/checkin.ts`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/liff/preVisitInputs.ts`
- `/Users/shota/Desktop/claude/pet-carte/server/src/routes/storeSettings.ts`
- `/Users/shota/Desktop/claude/pet-carte/server/src/db/migrations/001_initial_schema.sql`
- `/Users/shota/Desktop/claude/pet-carte/server/src/db/migrations/024_reservations_service_type.sql`
- `/Users/shota/Desktop/claude/pet-carte/server/src/db/migrations/025_records_table.sql`
