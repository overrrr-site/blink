import { useEffect, Suspense, lazy } from 'react';
import { Icon } from '../components/Icon'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLiffAuthStore } from './store/authStore';
import { initLiff } from './utils/liff';
import Layout from './components/Layout';
import { ToastProvider } from '../components/Toast';

// ページコンポーネントを遅延ロード
const Login = lazy(() => import('./pages/Login'));
const LinkAccount = lazy(() => import('./pages/LinkAccount'));
const Home = lazy(() => import('./pages/Home'));
const MyPage = lazy(() => import('./pages/MyPage'));
const ReservationsCalendar = lazy(() => import('./pages/ReservationsCalendar'));
const ReservationCreate = lazy(() => import('./pages/ReservationCreate'));
const ReservationEdit = lazy(() => import('./pages/ReservationEdit'));
const PreVisitInput = lazy(() => import('./pages/PreVisitInput'));
// JournalList は RecordList に移行済み
const JournalDetail = lazy(() => import('./pages/JournalDetail'));
const RecordList = lazy(() => import('./pages/RecordList'));
const RecordDetail = lazy(() => import('./pages/RecordDetail'));
const Announcements = lazy(() => import('./pages/Announcements'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));

// ページ遷移時のローディング表示
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin text-primary">
        <Icon icon="solar:spinner-line-duotone" width="40" height="40" />
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useLiffAuthStore();
  const location = useLocation();
  // 未認証時はログインページへリダイレクトし、元のURLをstateで渡す
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace state={{ from: location.pathname }} />;
}

function App() {
  const { initialize } = useLiffAuthStore();

  useEffect(() => {
    // ディープリンクのパスをsessionStorageに保存（LIFFリダイレクトでURLが消える前に）
    // basename="/liff" なので、window.location.pathname から /liff を除いたパスを保存
    const fullPath = window.location.pathname;
    const liffPath = fullPath.startsWith('/liff') ? fullPath.slice(5) : fullPath;
    if (liffPath && liffPath !== '/' && !sessionStorage.getItem('liff_redirect')) {
      sessionStorage.setItem('liff_redirect', liffPath);
    }

    // LIFF初期化
    initLiff().catch(() => {});

    // 認証状態を復元
    initialize();
  }, [initialize]);

  return (
    <ToastProvider>
      <BrowserRouter basename="/liff">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* ルート（/liff/）がログインページ - LIFFコールバック先 */}
            <Route path="/" element={<Login />} />
            <Route path="/link" element={<LinkAccount />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
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
              <Route path="journals" element={<Navigate to="/home/records" replace />} />
              <Route path="journals/:id" element={<JournalDetail />} />
              <Route path="records" element={<RecordList />} />
              <Route path="records/:id" element={<RecordDetail />} />
              <Route path="announcements" element={<Announcements />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
