import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { PageLoader } from './PageLoader'
import { AppRoutes } from './routes/AppRoutes'

export function AppRouter() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <AppRoutes />
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
