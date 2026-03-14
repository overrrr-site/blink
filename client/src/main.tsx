import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import { useAuthStore } from './store/authStore'

function initClarity(projectId: string): void {
  if (typeof window === 'undefined') return
  if (typeof window.clarity === 'function') return

  ((c: Window & { clarity?: (...args: unknown[]) => void }, l: Document, r: string, i: string) => {
    c.clarity = c.clarity || function(...args: unknown[]) {
      (c.clarity as unknown as { q?: unknown[][] }).q = (c.clarity as unknown as { q?: unknown[][] }).q || []
      ;(c.clarity as unknown as { q: unknown[][] }).q.push(args)
    }

    const script = l.createElement(r) as HTMLScriptElement
    script.async = true
    script.src = `https://www.clarity.ms/tag/${i}`

    const firstScript = l.getElementsByTagName(r)[0]
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript)
    } else {
      l.head.appendChild(script)
    }
  })(window as Window & { clarity?: (...args: unknown[]) => void }, document, 'script', projectId)
}

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const clarityProjectId = import.meta.env.VITE_CLARITY_PROJECT_ID
const browserTracingIntegration = (
  Sentry as typeof Sentry & { browserTracingIntegration?: () => unknown }
).browserTracingIntegration

if (import.meta.env.PROD && clarityProjectId) {
  initClarity(clarityProjectId)
}

Sentry.init({
  dsn: sentryDsn,
  enabled: import.meta.env.PROD && Boolean(sentryDsn),
  environment: import.meta.env.MODE,
  integrations: browserTracingIntegration ? [browserTracingIntegration()] : [],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (import.meta.env.DEV) {
      console.error('[Sentry]', event)
      return null
    }
    return event
  },
})

// アプリ起動時に認証状態を初期化
useAuthStore.getState().initialize()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
