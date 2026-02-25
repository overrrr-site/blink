export interface DaycarePreVisitData {
  pickup_time: '17:00' | '17:30' | '18:00' | 'other'
  pickup_time_other?: string
  energy: 'good' | 'poor'
  energy_detail?: string
  appetite: 'good' | 'poor'
  appetite_detail?: string
  poop: 'normal' | 'soft' | 'bloody'
  pee: 'normal' | 'dark' | 'bloody'
  vomiting: boolean
  vomiting_detail?: string
  itching: boolean
  itching_detail?: string
  medication: boolean
  medication_detail?: string
  last_poop_time?: string
  last_pee_time?: string
  last_meal_time?: string
  notes?: string
}

export const DEFAULT_DAYCARE_DATA: DaycarePreVisitData = {
  pickup_time: '17:00',
  energy: 'good',
  appetite: 'good',
  poop: 'normal',
  pee: 'normal',
  vomiting: false,
  itching: false,
  medication: false,
}

/** Human-readable labels for display */
export const DAYCARE_LABELS = {
  pickup_time: { '17:00': '17時', '17:30': '17時30分', '18:00': '18時', other: 'その他' },
  energy: { good: 'あり', poor: 'なし' },
  appetite: { good: 'あり', poor: 'なし' },
  poop: { normal: '問題なし', soft: '軟便', bloody: '血便' },
  pee: { normal: '問題なし', dark: '色が濃い', bloody: '血尿' },
} as const

/** Check if a daycare value is abnormal (for red badge display) */
export function isDaycareAbnormal(data: DaycarePreVisitData): boolean {
  return (
    data.energy === 'poor' ||
    data.appetite === 'poor' ||
    data.poop !== 'normal' ||
    data.pee !== 'normal' ||
    data.vomiting ||
    data.itching
  )
}
