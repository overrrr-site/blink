import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useLiffAuthStore } from './store/authStore';
import { initLiff } from './utils/liff';
import Layout from './components/Layout';
import { ToastProvider } from '../components/Toast';
import { ErrorBoundary } from '../components/ErrorBoundary';

// ページコンポーネントを遅延ロード
const Login = lazy(() => import('./pages/Login'));
const LinkAccount = lazy(() => import('./pages/LinkAccount'));
const Home = lazy(() => import('./pages/Home'));
const MyPage = lazy(() => import('./pages/MyPage'));
const ReservationsCalendar = lazy(() => import('./pages/ReservationsCalendar'));
const ReservationCreate = lazy(() => import('./pages/ReservationCreate'));
const ReservationEdit = lazy(() => import('./pages/ReservationEdit'));
const PreVisitInput = lazy(() => import('./pages/PreVisitInput'));
const RecordList = lazy(() => import('./pages/RecordList'));
const RecordDetail = lazy(() => import('./pages/RecordDetail'));
const Announcements = lazy(() => import('./pages/Announcements'));
const IntakeChat = lazy(() => import('./pages/IntakeChat'));
const IntakeResult = lazy(() => import('./pages/IntakeResult'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Terms = lazy(() => import('./pages/Terms'));

// ページ遷移時のローディング表示
function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
      <img src="/images/dog-running.webp" alt="" width={128} className="animate-bounce-x" />
      <p className="text-sm text-muted-foreground">読み込み中...</p>
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
    if (liffPath && liffPath !== '/' && liffPath !== '/home') {
      // 具体的なディープリンクパス（例: /home/records/123）は常に上書き保存
      sessionStorage.setItem('liff_redirect', liffPath);
    } else if (liffPath && liffPath !== '/' && !sessionStorage.getItem('liff_redirect')) {
      sessionStorage.setItem('liff_redirect', liffPath);
    }

    initLiff().catch((err) => {
      console.error('[LIFF] initialization failed:', err);
    });

    // 認証状態を復元
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
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
              <Route path="records" element={<RecordList />} />
              <Route path="records/:id" element={<RecordDetail />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="intake/:dogId" element={<IntakeChat />} />
              <Route path="intake-result/:dogId" element={<IntakeResult />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
