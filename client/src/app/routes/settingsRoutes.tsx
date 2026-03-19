import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { OwnerRoute } from '../guards/OwnerRoute'

const Settings = lazy(() => import('../../pages/Settings'))
const StaffEdit = lazy(() => import('../../pages/StaffEdit'))
const CourseEdit = lazy(() => import('../../pages/CourseEdit'))
const TrainingEdit = lazy(() => import('../../pages/training/TrainingEdit'))
const GroomingMenuEdit = lazy(() => import('../../pages/GroomingMenuEdit'))
const TrialConvertPage = lazy(() => import('../../pages/TrialConvertPage'))
const Billing = lazy(() => import('../../pages/Billing'))

export const settingsRoutes: RouteObject[] = [
  { path: '/settings', element: <Settings /> },
  { path: '/settings/staff/:id', element: <OwnerRoute><StaffEdit /></OwnerRoute> },
  { path: '/settings/courses/new', element: <OwnerRoute><CourseEdit /></OwnerRoute> },
  { path: '/settings/courses/:id', element: <OwnerRoute><CourseEdit /></OwnerRoute> },
  { path: '/settings/training/new', element: <OwnerRoute><TrainingEdit /></OwnerRoute> },
  { path: '/settings/training/:id', element: <OwnerRoute><TrainingEdit /></OwnerRoute> },
  { path: '/settings/grooming-menu/new', element: <OwnerRoute><GroomingMenuEdit /></OwnerRoute> },
  { path: '/settings/grooming-menu/:id', element: <OwnerRoute><GroomingMenuEdit /></OwnerRoute> },
  { path: '/settings/convert', element: <OwnerRoute><TrialConvertPage /></OwnerRoute> },
  { path: '/billing', element: <OwnerRoute><Billing /></OwnerRoute> },
]
