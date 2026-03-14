import api from '../api/client'
import { useAuthStore } from '../store/authStore'

export type UxEventName =
  | 'route_view'
  | 'cta_click'
  | 'form_error'
  | 'submit_success'
  | 'submit_fail'
  | 'api_slow'

export type UxFlow = 'reservation' | 'record'

export interface UxEvent {
  eventName: UxEventName
  flow: UxFlow
  step: string
  sessionId: string
  path: string
  storeId: number
  staffIdHash: string
  timestamp: string
  meta?: Record<string, string | number | boolean>
}

type UxSessionResult = 'success' | 'drop' | 'error'

type ClarityCommand = 'set' | 'event' | 'consent' | 'identify'

declare global {
  interface Window {
    clarity?: (command: ClarityCommand, ...args: unknown[]) => void
  }
}

const PII_KEY_PATTERNS = [/name/i, /phone/i, /email/i, /address/i, /memo/i, /note/i, /comment/i, /text/i, /dog/i]
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_PATTERN = /\b(?:\+?\d{1,3}[-\s]?)?(?:\d{2,4}[-\s]?){2,4}\d{3,4}\b/

function createSessionId(): string {
  const random = Math.random().toString(36).slice(2, 10)
  return `ux_${Date.now()}_${random}`
}

function hashText(input: string): string {
  let hash = 5381
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash |= 0
  }
  return `h${Math.abs(hash).toString(36)}`
}

function sanitizeMeta(meta?: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  if (!meta) return {}

  const sanitized: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (PII_KEY_PATTERNS.some((pattern) => pattern.test(key))) continue
    if (typeof value === 'string' && (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value))) continue
    sanitized[key] = value
  }
  return sanitized
}

function callClarity(command: ClarityCommand, ...args: unknown[]): void {
  if (typeof window === 'undefined' || typeof window.clarity !== 'function') return
  window.clarity(command, ...args)
}

export function getUxIdentity(): { storeId: number; staffIdHash: string } {
  const user = useAuthStore.getState().user
  if (!user) {
    return {
      storeId: 0,
      staffIdHash: 'anonymous',
    }
  }

  return {
    storeId: user.storeId,
    staffIdHash: hashText(`staff:${user.id}:store:${user.storeId}`),
  }
}

export function startUxSession(flow: UxFlow): string {
  const sessionId = createSessionId()
  callClarity('set', 'flow', flow)
  callClarity('set', 'session_id', sessionId)
  return sessionId
}

export function trackUxEvent(event: UxEvent): void {
  const meta = sanitizeMeta(event.meta)

  callClarity('set', 'flow', event.flow)
  callClarity('set', 'step', event.step)
  callClarity('set', 'session_id', event.sessionId)
  callClarity('event', `ux_${event.eventName}`)

  const payload = {
    event_name: event.eventName,
    flow: event.flow,
    step: event.step,
    session_id: event.sessionId,
    path: event.path,
    store_id: event.storeId,
    staff_id_hash: event.staffIdHash,
    timestamp: event.timestamp,
    meta,
  }

  void api.post('/ux-events', payload).catch(() => {
    // UX計測は本処理をブロックしない
  })
}

export function endUxSession(params: {
  flow: UxFlow
  sessionId: string
  result: UxSessionResult
  step?: string
}): void {
  const { storeId, staffIdHash } = getUxIdentity()
  trackUxEvent({
    eventName: params.result === 'success' ? 'submit_success' : 'submit_fail',
    flow: params.flow,
    step: params.step || `${params.flow}_completed`,
    sessionId: params.sessionId,
    path: window.location.pathname,
    storeId,
    staffIdHash,
    timestamp: new Date().toISOString(),
    meta: {
      result: params.result,
    },
  })
}

