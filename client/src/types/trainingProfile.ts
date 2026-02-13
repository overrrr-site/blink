export interface TrainingProfileCategory {
  id: number
  name: string
  category_type: 'grid' | 'log'
  goal?: string | null
  instructions?: string | null
  display_order: number
  enabled: boolean
  items?: TrainingProfileCategoryItem[]
}

export interface TrainingProfileCategoryItem {
  id: number
  training_item_id: number
  display_order: number
  item_label: string
  item_key: string
}

export interface AchievementLevel {
  id: number
  symbol: string
  label: string
  color_class?: string | null
  display_order: number
}

export interface GridEntry {
  id: number
  category_id: number
  training_item_id: number
  entry_date: string
  achievement_symbol: string
  staff_name?: string | null
}

export interface LogEntry {
  id: number
  category_id: number
  entry_date: string
  staff_name?: string | null
  note: string
}

export interface ConcernEntry {
  id: number
  entry_date: string
  staff_name?: string | null
  note: string
}

export interface TrainingProfileData {
  categories: TrainingProfileCategory[]
  achievementLevels: AchievementLevel[]
  gridEntries: GridEntry[]
  logEntries: LogEntry[]
  concerns: ConcernEntry[]
}
