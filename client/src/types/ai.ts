export type AISuggestionType = 'photo-concern' | 'health-history' | 'report-draft'

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
