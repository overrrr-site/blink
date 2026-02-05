import { useCallback, useEffect, useRef, useState } from 'react'

type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutoSaveOptions<T> {
  /** Data to watch for changes */
  data: T
  /** Save function that performs the API call */
  onSave: (data: T) => Promise<void>
  /** Debounce delay in ms after last change (default: 5000) */
  debounceMs?: number
  /** Periodic save interval in ms (default: 30000) */
  intervalMs?: number
  /** Disable autosave (e.g. when record is already shared) */
  disabled?: boolean
  /** Record ID (autosave only works for existing records) */
  recordId?: number | string | null
}

interface UseAutoSaveReturn {
  /** Current save status */
  status: AutoSaveStatus
  /** Last saved timestamp */
  lastSavedAt: Date | null
  /** Manually trigger save */
  saveNow: () => Promise<void>
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 5000,
  intervalMs = 30000,
  disabled = false,
  recordId,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

  // Refs to track latest values without triggering re-renders
  const dataRef = useRef(data)
  const lastSavedDataRef = useRef<string>('')
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intervalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savingRef = useRef(false)

  // Update data ref on each change
  useEffect(() => {
    dataRef.current = data
  }, [data])

  const performSave = useCallback(async () => {
    if (disabled || !recordId || savingRef.current) return

    const currentData = JSON.stringify(dataRef.current)
    // Skip if data hasn't changed since last save
    if (currentData === lastSavedDataRef.current) return

    savingRef.current = true
    setStatus('saving')

    try {
      await onSave(dataRef.current)
      lastSavedDataRef.current = currentData
      setLastSavedAt(new Date())
      setStatus('saved')
      // Reset to idle after 3 seconds
      setTimeout(() => setStatus((prev) => (prev === 'saved' ? 'idle' : prev)), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus((prev) => (prev === 'error' ? 'idle' : prev)), 5000)
    } finally {
      savingRef.current = false
    }
  }, [disabled, recordId, onSave])

  // Debounce: save 5s after last data change
  useEffect(() => {
    if (disabled || !recordId) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave()
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // We serialize data to detect actual value changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), debounceMs, disabled, recordId, performSave])

  // Periodic interval: save every 30s
  useEffect(() => {
    if (disabled || !recordId) return

    intervalTimerRef.current = setInterval(() => {
      performSave()
    }, intervalMs)

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current)
      }
    }
  }, [intervalMs, disabled, recordId, performSave])

  // Save on unmount (page leave)
  useEffect(() => {
    return () => {
      if (!disabled && recordId) {
        const currentData = JSON.stringify(dataRef.current)
        if (currentData !== lastSavedDataRef.current) {
          // Best-effort save on unmount (fire-and-forget)
          performSave()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, disabled])

  return {
    status,
    lastSavedAt,
    saveNow: performSave,
  }
}
