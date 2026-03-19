import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../PageLoader'
import { selectIsAuthenticated, useAuthStore } from '../../store/authStore'

export function PrivateRoute({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(selectIsAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return <PageLoader />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return children
}
