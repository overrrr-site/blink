import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getRandomGreeting } from '../utils/greetings'
import OnboardingGuide from './OnboardingGuide'

const Layout = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [fabOpen, setFabOpen] = useState(false)
  const [greeting] = useState(() => getRandomGreeting())

  // 新しい4タブ構成
  const navItems = [
    { path: '/', label: '今日', icon: 'solar:calendar-mark-bold' },
    { path: '/reservations', label: '予定', icon: 'solar:calendar-bold' },
    { path: '/customers', label: '顧客', icon: 'solar:users-group-rounded-bold' },
    { path: '/settings', label: '設定', icon: 'solar:settings-bold' },
  ]

  // FABメニューの項目
  const fabActions = [
    { label: '予約を追加', icon: 'solar:calendar-add-bold', path: '/reservations/new', color: 'bg-chart-1' },
    { label: '顧客を登録', icon: 'solar:user-plus-bold', path: '/owners/new', color: 'bg-chart-2' },
    { label: '日誌を作成', icon: 'solar:document-add-bold', path: '/journals/new', color: 'bg-chart-3' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    if (path === '/customers') {
      return location.pathname.startsWith('/owners') || location.pathname.startsWith('/dogs') || location.pathname.startsWith('/customers')
    }
    return location.pathname.startsWith(path)
  }

  const isHomePage = location.pathname === '/'

  const handleFabAction = (path: string) => {
    setFabOpen(false)
    navigate(path)
  }

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans">
      {isHomePage && (
        <header className="px-5 pt-4 pb-3 flex items-center justify-between bg-background sticky top-0 z-10 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
            <h1 className="text-lg font-bold font-heading text-foreground">
              {greeting}、
              {user?.name || 'スタッフ'}さん
            </h1>
          </div>
          <div className="size-10 rounded-full border-2 border-primary/20 p-0.5 bg-muted">
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.charAt(0) || 'S'}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {/* FABオーバーレイ */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setFabOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FABメニュー */}
      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 transition-all duration-300 ${
          fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {fabActions.map((action, index) => (
          <button
            key={action.path}
            onClick={(e) => {
              e.stopPropagation()
              handleFabAction(action.path)
            }}
            className={`flex items-center gap-3 ${action.color} text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform min-h-[44px]`}
            style={{
              transitionDelay: fabOpen ? `${index * 50}ms` : '0ms',
            }}
            aria-label={action.label}
          >
            <iconify-icon icon={action.icon} width="20" height="20" aria-hidden="true"></iconify-icon>
            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
          </button>
        ))}
      </div>

      {/* ナビゲーションバー */}
      <nav role="navigation" aria-label="メインナビゲーション" className="border-t border-border bg-background/95 backdrop-blur-md fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
        <div className="flex items-center justify-around px-1 relative">
          {/* 左側2つのタブ */}
          {navItems.slice(0, 2).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={`${item.label}へ移動`}
              aria-current={isActive(item.path) ? 'page' : undefined}
              data-guide={item.path === '/' ? 'nav-today' : item.path === '/reservations' ? 'nav-reservations' : undefined}
              className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] py-2 px-3 gap-1 transition-all rounded-lg active:scale-95 ${
                isActive(item.path)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive(item.path) && (
                <span className="absolute inset-x-2 top-1 h-8 bg-primary/10 rounded-lg" aria-hidden="true"></span>
              )}
              <iconify-icon icon={item.icon} width="24" height="24" aria-hidden="true" className="relative z-10"></iconify-icon>
              <span className={`text-xs relative z-10 ${isActive(item.path) ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          ))}

          {/* 中央のFABボタン */}
          <div className="relative flex items-center justify-center min-w-[72px]">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setFabOpen(!fabOpen)
              }}
              data-guide="fab-button"
              className={`absolute -top-6 size-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 ${
                fabOpen
                  ? 'bg-muted text-muted-foreground rotate-45'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95'
              }`}
              aria-label={fabOpen ? 'メニューを閉じる' : '新規作成'}
              style={{ minWidth: '56px', minHeight: '56px' }}
            >
              <iconify-icon icon="solar:add-circle-bold" width="28" height="28"></iconify-icon>
            </button>
          </div>

          {/* 右側2つのタブ */}
          {navItems.slice(2, 4).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              aria-label={`${item.label}へ移動`}
              aria-current={isActive(item.path) ? 'page' : undefined}
              data-guide={item.path === '/customers' ? 'nav-customers' : item.path === '/settings' ? 'nav-settings' : undefined}
              className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] py-2 px-3 gap-1 transition-all rounded-lg active:scale-95 ${
                isActive(item.path)
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive(item.path) && (
                <span className="absolute inset-x-2 top-1 h-8 bg-primary/10 rounded-lg" aria-hidden="true"></span>
              )}
              <iconify-icon icon={item.icon} width="24" height="24" aria-hidden="true" className="relative z-10"></iconify-icon>
              <span className={`text-xs relative z-10 ${isActive(item.path) ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* オンボーディングガイド */}
      <OnboardingGuide />
    </div>
  )
}

export default Layout
