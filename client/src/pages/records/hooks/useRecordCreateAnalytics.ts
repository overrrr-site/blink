import { useCallback, useEffect, useRef } from 'react'
import { endUxSession, getUxIdentity, startUxSession, trackUxEvent } from '../../../lib/uxAnalytics'

export type RecordCreateEventName =
  | 'route_view'
  | 'cta_click'
  | 'form_error'
  | 'submit_success'
  | 'submit_fail'
  | 'api_slow'

export type RecordCreateSessionResult = 'success' | 'drop' | 'error'

interface UseRecordCreateAnalyticsArgs {
  reservationId?: string
  storeId: number
}

export function useRecordCreateAnalytics({
  reservationId,
  storeId,
}: UseRecordCreateAnalyticsArgs) {
  const uxSessionIdRef = useRef<string>(startUxSession('record'))
  const sessionEndedRef = useRef(false)

  const finishSession = useCallback((
    result: RecordCreateSessionResult,
    step = 'record_submit',
  ) => {
    if (sessionEndedRef.current) return
    sessionEndedRef.current = true
    endUxSession({
      flow: 'record',
      sessionId: uxSessionIdRef.current,
      result,
      step,
    })
  }, [])

  const trackRecordEvent = useCallback((
    eventName: RecordCreateEventName,
    step: string,
    meta?: Record<string, string | number | boolean>,
  ) => {
    const identity = getUxIdentity()
    trackUxEvent({
      eventName,
      flow: 'record',
      step,
      sessionId: uxSessionIdRef.current,
      path: window.location.pathname,
      storeId: identity.storeId || storeId,
      staffIdHash: identity.staffIdHash,
      timestamp: new Date().toISOString(),
      meta,
    })
  }, [storeId])

  useEffect(() => {
    trackRecordEvent('route_view', reservationId ? 'record_create_from_reservation' : 'record_create')

    return () => {
      finishSession('drop', 'record_abandon')
    }
  }, [finishSession, reservationId, trackRecordEvent])

  return {
    finishSession,
    trackRecordEvent,
  }
}
