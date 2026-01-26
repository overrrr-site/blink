import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useLiffAuthStore } from '../store/authStore';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { owner } = useLiffAuthStore();

  const isActive = (path: string) => {
    if (path === '/home') {
      return location.pathname === '/home';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {/* ヘッダー */}
      <header className="px-5 pt-4 pb-4 bg-background sticky top-0 z-20 flex items-center justify-between border-b border-border">
        <button 
          onClick={() => navigate('/home')}
          className="flex items-center gap-3 active:opacity-70 transition-opacity"
          aria-label="ホームに戻る"
        >
          <div className="size-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center shadow-md">
            <iconify-icon icon="solar:paw-print-bold" width="24" height="24" class="text-white"></iconify-icon>
          </div>
          <div className="text-left">
            <h1 className="text-[10px] font-bold text-primary tracking-wider leading-none mb-0.5">BLINK</h1>
            <p className="text-sm font-bold font-heading text-foreground leading-none">
              {owner?.name || '飼い主'} 様
            </p>
          </div>
        </button>
        <button
          onClick={() => navigate('/home/mypage')}
          className="size-12 rounded-full border-2 border-primary/20 p-0.5 overflow-hidden 
                     active:scale-95 transition-transform hover:border-primary/40"
          aria-label="マイページ"
        >
          <div className="w-full h-full rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <iconify-icon icon="solar:user-bold" width="20" height="20" class="text-primary"></iconify-icon>
          </div>
        </button>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* ボトムナビゲーション */}
      <nav 
        className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border px-2 py-1 z-30 safe-area-pb"
        role="navigation"
        aria-label="メインナビゲーション"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <NavButton
            onClick={() => navigate('/home')}
            icon="solar:home-bold"
            label="ホーム"
            isActive={isActive('/home')}
          />
          <NavButton
            onClick={() => navigate('/home/reservations')}
            icon="solar:calendar-bold"
            label="予約"
            isActive={isActive('/home/reservations')}
          />
          <NavButton
            onClick={() => navigate('/home/journals')}
            icon="solar:notebook-bold"
            label="日誌"
            isActive={isActive('/home/journals')}
          />
          <NavButton
            onClick={() => navigate('/home/mypage')}
            icon="solar:user-bold"
            label="マイページ"
            isActive={isActive('/home/mypage')}
          />
        </div>
      </nav>
    </div>
  );
}

// ナビゲーションボタンコンポーネント
function NavButton({
  onClick,
  icon,
  label,
  isActive,
}: {
  onClick: () => void;
  icon: string;
  label: string;
  isActive: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] py-2 px-3 gap-1 transition-all rounded-lg active:scale-95 ${
        isActive
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span className="absolute inset-x-2 top-1 h-8 bg-primary/10 rounded-lg" aria-hidden="true"></span>
      )}
      <iconify-icon icon={icon} width="24" height="24" aria-hidden="true" class="relative z-10"></iconify-icon>
      <span className={`text-xs relative z-10 ${isActive ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  );
}
