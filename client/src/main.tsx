import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import { useAuthStore } from './store/authStore'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
const browserTracingIntegration = (
  Sentry as typeof Sentry & { browserTracingIntegration?: () => unknown }
).browserTracingIntegration

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
