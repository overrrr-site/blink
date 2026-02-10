import type { RecordType } from '../types/record'

export interface BusinessTypeColors {
  primary: string
  light: string
  pale: string
}

export interface EmptyStateConfig {
  title: string
  description: string
  actionLabel: string
}

export interface DashboardStatusLabels {
  waiting: string
  active: string
  done: string
  checkIn: string
  checkOut: string
}

export interface BusinessTypeConfig {
  type: RecordType
  label: string
  icon: string
  colors: BusinessTypeColors
  recordLabel: string
  onboardingLabel: string
  onboardingDescription: string
  onboardingIcon: string
  statusLabels: Record<string, string>
  dashboardStatusLabels: DashboardStatusLabels
  emptyState: EmptyStateConfig
}

export const BUSINESS_TYPE_ORDER: RecordType[] = ['daycare', 'grooming', 'hotel']

export const BUSINESS_TYPE_CONFIG: Record<RecordType, BusinessTypeConfig> = {
  daycare: {
    type: 'daycare',
    label: '幼稚園',
    icon: 'solar:sun-bold',
    colors: {
      primary: '#F97316',
      light: '#FDBA74',
      pale: '#FFF7ED',
    },
    recordLabel: '連絡帳',
    onboardingLabel: '犬の幼稚園',
    onboardingDescription: '日帰りでのお預かりとトレーニング',
    onboardingIcon: 'solar:book-2-bold',
    statusLabels: {
      '来店前': '登園前',
      '来店中': '登園中',
      '登園済': '登園中',
      '降園済': '降園済',
      '完了': '降園済',
    },
    dashboardStatusLabels: {
      waiting: '登園前',
      active: '登園中',
      done: '降園済',
      checkIn: '登園',
      checkOut: '降園',
    },
    emptyState: {
      title: '今日の登園予定はありません',
      description: '新しい予約を追加して登園スケジュールを管理しましょう',
      actionLabel: '予約を追加',
    },
  },
  grooming: {
    type: 'grooming',
    label: 'トリミング',
    icon: 'solar:scissors-bold',
    colors: {
      primary: '#8B5CF6',
      light: '#C4B5FD',
      pale: '#F5F3FF',
    },
    recordLabel: 'カルテ',
    onboardingLabel: 'トリミングサロン',
    onboardingDescription: 'カット・シャンプーなどのトリミング',
    onboardingIcon: 'solar:scissors-bold',
    statusLabels: {
      '来店前': '来店前',
      '来店中': '来店済',
      '完了': '来店済',
    },
    dashboardStatusLabels: {
      waiting: '来店前',
      active: '施術中',
      done: '完了',
      checkIn: '来店',
      checkOut: '完了',
    },
    emptyState: {
      title: '今日の予約はありません',
      description: '新しい予約を追加してトリミングスケジュールを管理しましょう',
      actionLabel: '予約を追加',
    },
  },
  hotel: {
    type: 'hotel',
    label: 'ホテル',
    icon: 'solar:moon-bold',
    colors: {
      primary: '#06B6D4',
      light: '#67E8F9',
      pale: '#ECFEFF',
    },
    recordLabel: 'カルテ',
    onboardingLabel: 'ペットホテル',
    onboardingDescription: '宿泊でのお預かり',
    onboardingIcon: 'solar:moon-bold',
    statusLabels: {
      '来店前': 'チェックイン前',
      '来店中': 'お預かり中',
      '完了': 'チェックアウト済',
    },
    dashboardStatusLabels: {
      waiting: 'チェックイン前',
      active: 'お預かり中',
      done: 'チェックアウト済',
      checkIn: 'チェックイン',
      checkOut: 'チェックアウト',
    },
    emptyState: {
      title: '今日のお預かり予定はありません',
      description: '新しい予約を追加してホテルスケジュールを管理しましょう',
      actionLabel: '予約を追加',
    },
  },
}

export const EMPTY_STATE_ALL: EmptyStateConfig = {
  title: '今日の予定はありません',
  description: '新しい予約を追加しましょう',
  actionLabel: '予約を追加',
}

export const RECORD_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'すべて' },
  ...BUSINESS_TYPE_ORDER.map((type) => ({
    value: type,
    label: BUSINESS_TYPE_CONFIG[type].label,
  })),
]

export const ONBOARDING_BUSINESS_TYPES: Array<{
  value: RecordType
  label: string
  icon: string
  description: string
}> = BUSINESS_TYPE_ORDER.map((type) => ({
  value: type,
  label: BUSINESS_TYPE_CONFIG[type].onboardingLabel,
  icon: BUSINESS_TYPE_CONFIG[type].onboardingIcon,
  description: BUSINESS_TYPE_CONFIG[type].onboardingDescription,
}))

export function getBusinessTypeConfig(type: RecordType | null | undefined): BusinessTypeConfig {
  if (!type) return BUSINESS_TYPE_CONFIG.daycare
  return BUSINESS_TYPE_CONFIG[type] || BUSINESS_TYPE_CONFIG.daycare
}

export function getBusinessTypeColors(type: RecordType): BusinessTypeColors {
  return BUSINESS_TYPE_CONFIG[type]?.colors || BUSINESS_TYPE_CONFIG.daycare.colors
}

export function getBusinessTypeLabel(type: RecordType): string {
  return BUSINESS_TYPE_CONFIG[type]?.label || type
}

export function getBusinessTypeIcon(type: RecordType): string {
  return BUSINESS_TYPE_CONFIG[type]?.icon || 'solar:document-bold'
}

export function getRecordLabel(type?: RecordType | null): string {
  return type === 'daycare' ? '連絡帳' : 'カルテ'
}

export function getEmptyStateMessage(businessType: RecordType | null): EmptyStateConfig {
  return businessType ? BUSINESS_TYPE_CONFIG[businessType].emptyState : EMPTY_STATE_ALL
}

export function getDashboardEmptyStateMessage(businessType: RecordType | null): EmptyStateConfig {
  return businessType ? BUSINESS_TYPE_CONFIG[businessType].emptyState : EMPTY_STATE_ALL
}

export function getStatusLabel(businessType: RecordType | null, status: string): string {
  if (!businessType) return status
  return BUSINESS_TYPE_CONFIG[businessType]?.statusLabels[status] || status
}

export function getDashboardStatusLabels(businessType: RecordType | null): DashboardStatusLabels {
  return getBusinessTypeConfig(businessType).dashboardStatusLabels
}

export function isSimpleStatusType(businessType: RecordType | null): boolean {
  return businessType === 'grooming'
}
