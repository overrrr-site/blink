import { Navigate, useRoutes } from 'react-router-dom'
import { publicRoutes } from './publicRoutes'
import { staffRoutes } from './staffRoutes'

export const appRoutes = [
  ...publicRoutes,
  ...staffRoutes,
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]

export function AppRoutes() {
  return useRoutes(appRoutes)
}
