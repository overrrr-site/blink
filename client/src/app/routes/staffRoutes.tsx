import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import Layout from '../../components/Layout'
import { PrivateRoute } from '../guards/PrivateRoute'
import { customerRoutes } from './customerRoutes'
import { reservationRoutes } from './reservationRoutes'
import { recordRoutes } from './recordRoutes'
import { settingsRoutes } from './settingsRoutes'

const Dashboard = lazy(() => import('../../pages/Dashboard'))
const InspectionRecordList = lazy(() => import('../../pages/InspectionRecordList'))
const AnnouncementList = lazy(() => import('../../pages/AnnouncementList'))
const Help = lazy(() => import('../../pages/Help'))

export const staffRoutes: RouteObject[] = [
  {
    element: <PrivateRoute><Layout /></PrivateRoute>,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      ...customerRoutes,
      ...reservationRoutes,
      ...recordRoutes,
      { path: '/inspection-records', element: <InspectionRecordList /> },
      { path: '/announcements', element: <AnnouncementList /> },
      ...settingsRoutes,
      { path: '/help', element: <Help /> },
    ],
  },
]
