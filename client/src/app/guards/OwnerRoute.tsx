import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { PageLoader } from '../PageLoader'
import { selectUser, useAuthStore } from '../../store/authStore'

export function OwnerRoute({ children }: { children: ReactNode }) {
  const user = useAuthStore(selectUser)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return <PageLoader />
  }

  if (!user?.isOwner) {
    return <Navigate to="/settings" replace />
  }

  return children
}
