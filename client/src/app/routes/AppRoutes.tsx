import { useRoutes } from 'react-router-dom'
import { publicRoutes } from './publicRoutes'
import { staffRoutes } from './staffRoutes'

const routes = [
  ...publicRoutes,
  ...staffRoutes,
]

export function AppRoutes() {
  return useRoutes(routes)
}
