import { lazy } from 'react'
import type { RouteObject } from 'react-router-dom'

const LandingPage = lazy(() => import('../../pages/LandingPage'))
const Login = lazy(() => import('../../pages/Login'))
const AuthCallback = lazy(() => import('../../pages/AuthCallback'))
const ResetPassword = lazy(() => import('../../pages/ResetPassword'))
const PrivacyPolicy = lazy(() => import('../../pages/PrivacyPolicy'))
const Terms = lazy(() => import('../../pages/Terms'))

export const publicRoutes: RouteObject[] = [
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <Login /> },
  { path: '/auth/callback', element: <AuthCallback /> },
  { path: '/auth/reset-password', element: <ResetPassword /> },
  { path: '/privacy', element: <PrivacyPolicy /> },
  { path: '/terms', element: <Terms /> },
]
