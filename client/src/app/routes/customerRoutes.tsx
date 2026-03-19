import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'
import { Navigate } from 'react-router-dom'

const Customers = lazy(() => import('../../pages/Customers'))
const OwnerCreate = lazy(() => import('../../pages/owners/OwnerCreate'))
const OwnerDetail = lazy(() => import('../../pages/owners/OwnerDetail'))
const OwnerEdit = lazy(() => import('../../pages/owners/OwnerEdit'))
const DogCreate = lazy(() => import('../../pages/dogs/DogCreate'))
const DogDetail = lazy(() => import('../../pages/dogs/DogDetail'))
const DogEdit = lazy(() => import('../../pages/dogs/DogEdit'))
const DogTrainingProfile = lazy(() => import('../../pages/dogs/DogTrainingProfile'))
const ContractEdit = lazy(() => import('../../pages/ContractEdit'))

export const customerRoutes: RouteObject[] = [
  { path: '/customers', element: <Customers /> },
  { path: '/owners', element: <Navigate to="/customers" replace /> },
  { path: '/owners/new', element: <OwnerCreate /> },
  { path: '/owners/:id', element: <OwnerDetail /> },
  { path: '/owners/:id/edit', element: <OwnerEdit /> },
  { path: '/owners/:ownerId/dogs/new', element: <DogCreate /> },
  { path: '/dogs', element: <Navigate to="/customers" replace /> },
  { path: '/dogs/:id', element: <DogDetail /> },
  { path: '/dogs/:id/edit', element: <DogEdit /> },
  { path: '/dogs/:dogId/training', element: <DogTrainingProfile /> },
  { path: '/dogs/:dogId/contracts/new', element: <ContractEdit /> },
  { path: '/dogs/:dogId/contracts/:id', element: <ContractEdit /> },
]
