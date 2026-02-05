export type AISuggestionType =
  | 'photo-concern'
  | 'health-history'
  | 'report-draft'
  | 'weight-change'
  | 'long-absence'
  | 'birthday'
  | 'follow-up'
  | 'training-progress'
  | 'long-stay'

export interface AISuggestionData {
  type: AISuggestionType
  message: string
  preview?: string
  actionLabel?: string
  variant?: 'default' | 'warning' | 'success'
  payload?: Record<string, unknown>
  dismissed?: boolean
  applied?: boolean
}
