import type { MealEntry } from '../../types/meal'

export type { Staff } from '../../types/staff'
export type { MealEntry }

export interface TrainingItem {
  id: string
  label: string
}

export interface TrainingCategory {
  label: string
  icon: string
  items: TrainingItem[]
}

export interface AchievementOption {
  value: string
  label: string
  color: string
}

export interface JournalFormData {
  staff_id: string
  morning_toilet_status: string
  morning_toilet_location: string
  afternoon_toilet_status: string
  afternoon_toilet_location: string
  training_data: Record<string, string>
  memo: string
  comment: string
  next_visit_date: string
  meal_data: MealEntry[]
}

export interface PhotoAnalysisResult {
  analysis?: string
  suggested_comment?: string
  training_suggestions?: string[]
}

export interface ReservationSummary {
  dog_name: string
  owner_name: string
  visit_count: number
  dog_id?: number | null
  reservation_date?: string | null
  next_visit_date?: string | null
}
