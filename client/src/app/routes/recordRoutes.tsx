import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const RecordList = lazy(() => import('../../pages/RecordList'))
const RecordIncomplete = lazy(() => import('../../pages/RecordIncomplete'))
const RecordCreate = lazy(() => import('../../pages/RecordCreate'))
const RecordDetail = lazy(() => import('../../pages/RecordDetail'))

export const recordRoutes: RouteObject[] = [
  { path: '/records', element: <RecordList /> },
  { path: '/records/incomplete', element: <RecordIncomplete /> },
  { path: '/records/new', element: <RecordCreate /> },
  { path: '/records/create/:reservationId', element: <RecordCreate /> },
  { path: '/records/:id', element: <RecordDetail /> },
]
