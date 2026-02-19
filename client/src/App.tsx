import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Icon } from '@/components/Icon'
import { SWRConfig } from 'swr'
import { useAuthStore, selectIsAuthenticated, selectUser } from './store/authStore'
import { fetcher } from './lib/swr'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'

const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const OwnerDetail = lazy(() => import('./pages/OwnerDetail'))
const DogDetail = lazy(() => import('./pages/DogDetail'))
const ReservationsCalendar = lazy(() => import('./pages/ReservationsCalendar'))
const ReservationDetail = lazy(() => import('./pages/ReservationDetail'))
const JournalCreate = lazy(() => import('./pages/JournalCreate'))
const JournalDetail = lazy(() => import('./pages/JournalDetail'))
const JournalNew = lazy(() => import('./pages/JournalNew'))
// journals routes are redirected to records; lazy imports kept only for direct journal detail/create

const RecordList = lazy(() => import('./pages/RecordList'))
const RecordCreate = lazy(() => import('./pages/RecordCreate'))
const RecordDetail = lazy(() => import('./pages/RecordDetail'))
const Settings = lazy(() => import('./pages/Settings'))
const OwnerCreate = lazy(() => import('./pages/OwnerCreate'))
const OwnerEdit = lazy(() => import('./pages/OwnerEdit'))
const DogCreate = lazy(() => import('./pages/DogCreate'))
const DogEdit = lazy(() => import('./pages/DogEdit'))
const ReservationCreate = lazy(() => import('./pages/ReservationCreate'))
const GroomingReservationCreate = lazy(() => import('./pages/GroomingReservationCreate'))
const HotelReservationCreate = lazy(() => import('./pages/HotelReservationCreate'))
const Customers = lazy(() => import('./pages/Customers'))
const ContractEdit = lazy(() => import('./pages/ContractEdit'))
const StaffEdit = lazy(() => import('./pages/StaffEdit'))
const CourseEdit = lazy(() => import('./pages/CourseEdit'))
const TrainingEdit = lazy(() => import('./pages/TrainingEdit'))
const GroomingMenuEdit = lazy(() => import('./pages/GroomingMenuEdit'))
const Billing = lazy(() => import('./pages/Billing'))
const Help = lazy(() => import('./pages/Help'))
const InspectionRecordList = lazy(() => import('./pages/InspectionRecordList'))
const AnnouncementList = lazy(() => import('./pages/AnnouncementList'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const Terms = lazy(() => import('./pages/Terms'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const DogTrainingProfile = lazy(() => import('./pages/DogTrainingProfile'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin text-primary">
        <Icon icon="solar:spinner-line-duotone" width="48" height="48" />
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
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

function OwnerRoute({ children }: { children: React.ReactNode }) {
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

function App() {
  return (
    <ToastProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          dedupingInterval: 5000,
          focusThrottleInterval: 10000,
          errorRetryCount: 2,
        }}
      >
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/onboarding"
                element={
                  <PrivateRoute>
                    <Onboarding />
                  </PrivateRoute>
                }
              />
              <Route
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/owners" element={<Navigate to="/customers" replace />} />
                <Route path="/owners/new" element={<OwnerCreate />} />
                <Route path="/owners/:id" element={<OwnerDetail />} />
                <Route path="/owners/:id/edit" element={<OwnerEdit />} />
                <Route path="/owners/:ownerId/dogs/new" element={<DogCreate />} />
                <Route path="/dogs" element={<Navigate to="/customers" replace />} />
                <Route path="/dogs/:id" element={<DogDetail />} />
                <Route path="/dogs/:id/edit" element={<DogEdit />} />
                <Route path="/dogs/:dogId/training" element={<DogTrainingProfile />} />
                <Route path="/dogs/:dogId/contracts/new" element={<ContractEdit />} />
                <Route path="/dogs/:dogId/contracts/:id" element={<ContractEdit />} />
                <Route path="/settings/staff/:id" element={<OwnerRoute><StaffEdit /></OwnerRoute>} />
                <Route path="/settings/courses/new" element={<OwnerRoute><CourseEdit /></OwnerRoute>} />
                <Route path="/settings/courses/:id" element={<OwnerRoute><CourseEdit /></OwnerRoute>} />
                <Route path="/settings/training/new" element={<OwnerRoute><TrainingEdit /></OwnerRoute>} />
                <Route path="/settings/training/:id" element={<OwnerRoute><TrainingEdit /></OwnerRoute>} />
                <Route path="/settings/grooming-menu/new" element={<OwnerRoute><GroomingMenuEdit /></OwnerRoute>} />
                <Route path="/settings/grooming-menu/:id" element={<OwnerRoute><GroomingMenuEdit /></OwnerRoute>} />
                <Route path="/reservations" element={<ReservationsCalendar />} />
                <Route path="/reservations/new" element={<ReservationCreate />} />
                <Route path="/reservations/grooming/create" element={<GroomingReservationCreate />} />
                <Route path="/reservations/hotel/create" element={<HotelReservationCreate />} />
                <Route path="/reservations/:id" element={<ReservationDetail />} />
                <Route path="/records" element={<RecordList />} />
                <Route path="/records/incomplete" element={<JournalNew />} />
                <Route path="/records/new" element={<RecordCreate />} />
                <Route path="/records/:id" element={<RecordDetail />} />
                <Route path="/records/create/:reservationId" element={<RecordCreate />} />
                {/* 旧日誌URLからカルテへのリダイレクト */}
                <Route path="/journals" element={<Navigate to="/records" replace />} />
                <Route path="/journals/new" element={<Navigate to="/records/incomplete" replace />} />
                <Route path="/journals/:id" element={<JournalDetail />} />
                <Route path="/journals/create/:reservationId" element={<JournalCreate />} />
                <Route path="/inspection-records" element={<InspectionRecordList />} />
                <Route path="/announcements" element={<AnnouncementList />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/billing" element={<OwnerRoute><Billing /></OwnerRoute>} />
                <Route path="/help" element={<Help />} />
              </Route>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </BrowserRouter>
      </SWRConfig>
    </ToastProvider>
  )
}

export default App
