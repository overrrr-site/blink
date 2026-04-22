import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import LiffApp from './App';
import '../index.css';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: import.meta.env.PROD && Boolean(sentryDsn),
  environment: 'liff',
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (import.meta.env.DEV) {
      console.error('[Sentry][LIFF]', event);
      return null;
    }
    return event;
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LiffApp />
  </React.StrictMode>
);
