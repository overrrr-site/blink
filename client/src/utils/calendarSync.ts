type CalendarSyncPayload = {
  status?: 'synced' | 'skipped' | 'failed'
  reason?: string
}

type ResponseWithCalendarSync = {
  calendar_sync?: CalendarSyncPayload
}

export function getCalendarSyncWarningMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const calendarSync = (payload as ResponseWithCalendarSync).calendar_sync
  if (!calendarSync || calendarSync.status !== 'failed') {
    return null
  }

  return calendarSync.reason
    ? `Googleカレンダー同期に失敗しました: ${calendarSync.reason}`
    : 'Googleカレンダー同期に失敗しました'
}
