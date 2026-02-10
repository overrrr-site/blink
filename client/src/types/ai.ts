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
  input_trace?: AIInputTraceItem[]
  generated_from?: string[]
  dismissed?: boolean
  applied?: boolean
}

export interface AIInputTraceItem {
  key: string
  label: string
  status: 'present' | 'missing'
  count?: number
}
