import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { ToastProvider } from './components/Toast'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import OwnerDetail from './pages/OwnerDetail'
import DogDetail from './pages/DogDetail'
import ReservationsCalendar from './pages/ReservationsCalendar'
import ReservationDetail from './pages/ReservationDetail'
import JournalCreate from './pages/JournalCreate'
import JournalDetail from './pages/JournalDetail'
import JournalList from './pages/JournalList'
import JournalNew from './pages/JournalNew'
import Settings from './pages/Settings'
import OwnerCreate from './pages/OwnerCreate'
import OwnerEdit from './pages/OwnerEdit'
import DogCreate from './pages/DogCreate'
import DogEdit from './pages/DogEdit'
import ReservationCreate from './pages/ReservationCreate'
import Customers from './pages/Customers'
import ContractEdit from './pages/ContractEdit'
import StaffEdit from './pages/StaffEdit'
import CourseEdit from './pages/CourseEdit'
import TrainingEdit from './pages/TrainingEdit'
import Billing from './pages/Billing'
import Help from './pages/Help'
import InspectionRecord from './pages/InspectionRecord'
import InspectionRecordList from './pages/InspectionRecordList'
import Layout from './components/Layout'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  // 認証状態を確認中はローディング表示
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin text-primary">
          <iconify-icon icon="solar:spinner-line-duotone" width="48" height="48"></iconify-icon>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
      </BrowserRouter>
    </ToastProvider>
  )
}

export default App
