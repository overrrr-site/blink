import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const ReservationsCalendar = lazy(() => import('../../pages/reservations/ReservationsCalendar'))
const ReservationCreate = lazy(() => import('../../pages/reservations/ReservationCreate'))
const GroomingReservationCreate = lazy(() => import('../../pages/reservations/GroomingReservationCreate'))
const HotelReservationCreate = lazy(() => import('../../pages/reservations/HotelReservationCreate'))
const ReservationDetail = lazy(() => import('../../pages/reservations/ReservationDetail'))

export const reservationRoutes: RouteObject[] = [
  { path: '/reservations', element: <ReservationsCalendar /> },
  { path: '/reservations/new', element: <ReservationCreate /> },
  { path: '/reservations/grooming/create', element: <GroomingReservationCreate /> },
  { path: '/reservations/hotel/create', element: <HotelReservationCreate /> },
  { path: '/reservations/:id', element: <ReservationDetail /> },
]
