import type { RecordType } from '../types/record'

interface EmptyStateConfig {
  title: string
  description: string
  actionLabel: string
}

export const EMPTY_STATE_MESSAGES: Record<RecordType | 'all', EmptyStateConfig> = {
  daycare: {
    title: '今日の登園予定はありません',
    description: '新しい予約を追加して登園スケジュールを管理しましょう',
    actionLabel: '予約を追加',
  },
  grooming: {
    title: '今日の予約はありません',
    description: '新しい予約を追加してトリミングスケジュールを管理しましょう',
    actionLabel: '予約を追加',
  },
  hotel: {
    title: '今日のお預かり予定はありません',
    description: '新しい予約を追加してホテルスケジュールを管理しましょう',
    actionLabel: '予約を追加',
  },
  all: {
    title: '今日の予定はありません',
    description: '新しい予約を追加しましょう',
    actionLabel: '予約を追加',
  },
}

/**
 * 業種別のステータスラベルを定義
 * - 幼稚園: 登園前 → 登園中 → 降園済
 * - トリミング: 来店前 → 来店済（シンプル2ステータス）
 * - ホテル: チェックイン前 → お預かり中 → チェックアウト済
 */
export const STATUS_LABELS: Record<RecordType, Record<string, string>> = {
  daycare: {
    '来店前': '登園前',
    '来店中': '登園中',
    '登園済': '登園中',
    '降園済': '降園済',
    '完了': '降園済',
  },
  grooming: {
    '来店前': '来店前',
    '来店中': '来店済',
    '完了': '来店済',
  },
  hotel: {
    '来店前': 'チェックイン前',
    '来店中': 'お預かり中',
    '完了': 'チェックアウト済',
  },
}

/**
 * 業種に応じた空状態メッセージを取得
 */
export function getEmptyStateMessage(businessType: RecordType | null): EmptyStateConfig {
  return EMPTY_STATE_MESSAGES[businessType || 'all']
}

/**
 * 業種に応じたステータスラベルを取得
 */
export function getStatusLabel(businessType: RecordType | null, status: string): string {
  if (!businessType) return status
  return STATUS_LABELS[businessType]?.[status] || status
}

/**
 * トリミングかどうかを判定（ステータス管理が簡易）
 */
export function isSimpleStatusType(businessType: RecordType | null): boolean {
  return businessType === 'grooming'
}
