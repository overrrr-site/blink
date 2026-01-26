import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuthStore } from './store/authStore'
import { ToastProvider } from './components/Toast'
import Layout from './components/Layout'

// ページコンポーネントを遅延ロード
const Login = lazy(() => import('./pages/Login'))
const AuthCallback = lazy(() => import('./pages/AuthCallback'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const OwnerDetail = lazy(() => import('./pages/OwnerDetail'))
const DogDetail = lazy(() => import('./pages/DogDetail'))
const ReservationsCalendar = lazy(() => import('./pages/ReservationsCalendar'))
const ReservationDetail = lazy(() => import('./pages/ReservationDetail'))
const JournalCreate = lazy(() => import('./pages/JournalCreate'))
const JournalDetail = lazy(() => import('./pages/JournalDetail'))
const JournalList = lazy(() => import('./pages/JournalList'))
const JournalNew = lazy(() => import('./pages/JournalNew'))
const Settings = lazy(() => import('./pages/Settings'))
const OwnerCreate = lazy(() => import('./pages/OwnerCreate'))
const OwnerEdit = lazy(() => import('./pages/OwnerEdit'))
const DogCreate = lazy(() => import('./pages/DogCreate'))
const DogEdit = lazy(() => import('./pages/DogEdit'))
const ReservationCreate = lazy(() => import('./pages/ReservationCreate'))
const Customers = lazy(() => import('./pages/Customers'))
const ContractEdit = lazy(() => import('./pages/ContractEdit'))
const StaffEdit = lazy(() => import('./pages/StaffEdit'))
const CourseEdit = lazy(() => import('./pages/CourseEdit'))
const TrainingEdit = lazy(() => import('./pages/TrainingEdit'))
const Billing = lazy(() => import('./pages/Billing'))
const Help = lazy(() => import('./pages/Help'))
const InspectionRecord = lazy(() => import('./pages/InspectionRecord'))
const InspectionRecordList = lazy(() => import('./pages/InspectionRecordList'))

// ページ遷移時のローディング表示
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin text-primary">
        <iconify-icon icon="solar:spinner-line-duotone" width="48" height="48"></iconify-icon>
      </div>
    </div>
  )
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  // 認証状態を確認中はローディング表示
  if (isLoading) {
    return <PageLoader />
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="customers" element={<Customers />} />
              <Route path="owners" element={<Navigate to="/customers" replace />} />
              <Route path="owners/new" element={<OwnerCreate />} />
              <Route path="owners/:id" element={<OwnerDetail />} />
              <Route path="owners/:id/edit" element={<OwnerEdit />} />
              <Route path="owners/:ownerId/dogs/new" element={<DogCreate />} />
              <Route path="dogs" element={<Navigate to="/customers" replace />} />
              <Route path="dogs/:id" element={<DogDetail />} />
              <Route path="dogs/:id/edit" element={<DogEdit />} />
              <Route path="dogs/:dogId/contracts/new" element={<ContractEdit />} />
              <Route path="dogs/:dogId/contracts/:id" element={<ContractEdit />} />
              <Route path="settings/staff/new" element={<StaffEdit />} />
              <Route path="settings/staff/:id" element={<StaffEdit />} />
              <Route path="settings/courses/new" element={<CourseEdit />} />
              <Route path="settings/courses/:id" element={<CourseEdit />} />
              <Route path="settings/training/new" element={<TrainingEdit />} />
              <Route path="settings/training/:id" element={<TrainingEdit />} />
              <Route path="reservations" element={<ReservationsCalendar />} />
              <Route path="reservations/new" element={<ReservationCreate />} />
              <Route path="reservations/:id" element={<ReservationDetail />} />
              <Route path="journals" element={<JournalList />} />
              <Route path="journals/new" element={<JournalNew />} />
              <Route path="journals/:id" element={<JournalDetail />} />
              <Route path="journals/create/:reservationId" element={<JournalCreate />} />
              <Route path="inspection-records" element={<InspectionRecordList />} />
              <Route path="inspection-records/:date" element={<InspectionRecord />} />
              <Route path="settings" element={<Settings />} />
              <Route path="billing" element={<Billing />} />
              <Route path="help" element={<Help />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
