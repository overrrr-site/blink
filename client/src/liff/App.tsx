import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLiffAuthStore } from './store/authStore';
import { initLiff } from './utils/liff';
import Login from './pages/Login';
import LinkAccount from './pages/LinkAccount';
import Home from './pages/Home';
import MyPage from './pages/MyPage';
import ReservationsCalendar from './pages/ReservationsCalendar';
import ReservationCreate from './pages/ReservationCreate';
import ReservationEdit from './pages/ReservationEdit';
import PreVisitInput from './pages/PreVisitInput';
import JournalList from './pages/JournalList';
import JournalDetail from './pages/JournalDetail';
import Layout from './components/Layout';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useLiffAuthStore();
  // LIFFアプリ内では basename="/liff" なので、相対パスで指定
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function App() {
  const { initialize } = useLiffAuthStore();

  useEffect(() => {
    // LIFF初期化
    initLiff().catch((error) => {
      console.error('Failed to initialize LIFF:', error);
    });

    // 認証状態を復元
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter basename="/liff">
      <Routes>
        {/* ルート（/liff/）がログインページ - LIFFコールバック先 */}
        <Route path="/" element={<Login />} />
        <Route path="/link" element={<LinkAccount />} />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Home />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="reservations" element={<ReservationsCalendar />} />
          <Route path="reservations/new" element={<ReservationCreate />} />
          <Route path="reservations/:id/edit" element={<ReservationEdit />} />
          <Route path="pre-visit/:reservationId" element={<PreVisitInput />} />
          <Route path="journals" element={<JournalList />} />
          <Route path="journals/:id" element={<JournalDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
