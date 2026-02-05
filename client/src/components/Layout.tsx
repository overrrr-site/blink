import { useState, useCallback } from 'react'
import { Icon } from './Icon'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getRandomGreeting } from '../utils/greetings'
import OnboardingGuide from './OnboardingGuide'

const NAV_ITEMS = [
  { path: '/dashboard', label: '今日', icon: 'solar:calendar-mark-bold' },
  { path: '/reservations', label: '予定', icon: 'solar:calendar-bold' },
  { path: '/customers', label: '顧客', icon: 'solar:users-group-rounded-bold' },
  { path: '/settings', label: '設定', icon: 'solar:settings-bold' },
] as const

const FAB_ACTIONS = [
  { label: '予約を追加', icon: 'solar:calendar-add-bold', path: '/reservations/new', color: 'bg-chart-1' },
  { label: '顧客を登録', icon: 'solar:user-plus-bold', path: '/owners/new', color: 'bg-chart-2' },
  { label: 'カルテを作成', icon: 'solar:clipboard-add-bold', path: '/records/new', color: 'bg-chart-3' },
] as const

const GUIDE_KEYS: Record<string, string> = {
  '/dashboard': 'nav-today',
  '/reservations': 'nav-reservations',
  '/customers': 'nav-customers',
  '/settings': 'nav-settings',
}

function getIsActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/dashboard') {
    return pathname === '/dashboard'
  }
  if (itemPath === '/customers') {
    return pathname.startsWith('/owners') || pathname.startsWith('/dogs') || pathname.startsWith('/customers')
  }
  return pathname.startsWith(itemPath)
}

interface NavButtonProps {
  path: string
  label: string
  icon: string
  active: boolean
  onClick: () => void
}

function NavButton({ path, label, icon, active, onClick }: NavButtonProps): JSX.Element {
  const guideKey = GUIDE_KEYS[path]

  return (
    <button
      onClick={onClick}
      aria-label={`${label}へ移動`}
      aria-current={active ? 'page' : undefined}
      data-guide={guideKey}
      className={`relative flex flex-col items-center justify-center min-w-[64px] min-h-[56px] py-2 px-3 gap-1 transition-all rounded-lg active:scale-95 ${
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {active && (
        <span className="absolute inset-x-2 top-1 h-8 bg-primary/10 rounded-lg" aria-hidden="true" />
      )}
      <Icon icon={icon} width="24" height="24" aria-hidden="true" className="relative z-10" />
      <span className={`text-xs relative z-10 ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  )
}

function Layout(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const [fabOpen, setFabOpen] = useState(false)
  const [greeting] = useState(() => getRandomGreeting())

  const isActive = useCallback(
    (path: string) => getIsActive(location.pathname, path),
    [location.pathname],
  )

  const isHomePage = location.pathname === '/dashboard'

  function handleFabAction(path: string): void {
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
            <h1 className="text-xl font-bold font-heading text-foreground">
              {greeting}、<br />
              {user?.name || 'スタッフ'}さん
            </h1>
          </div>
          <div className="size-12 rounded-full border-2 border-primary/20 p-0.5 bg-muted">
            <div className="w-full h-full rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base">
              {user?.name?.charAt(0) || 'S'}
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>

      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={() => setFabOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 transition-all duration-300 ${
          fabOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {FAB_ACTIONS.map((action, index) => (
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
            <Icon icon={action.icon} width="20" height="20" aria-hidden="true" />
            <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
          </button>
        ))}
      </div>

      <nav role="navigation" aria-label="メインナビゲーション" className="border-t border-border bg-background/95 backdrop-blur-md fixed bottom-0 left-0 right-0 z-50 safe-area-pb">
        <div className="flex items-center justify-around px-1 relative">
          {NAV_ITEMS.slice(0, 2).map((item) => (
            <NavButton
              key={item.path}
              path={item.path}
              label={item.label}
              icon={item.icon}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}

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
              <Icon icon="solar:add-circle-bold" width="28" height="28" />
            </button>
          </div>

          {NAV_ITEMS.slice(2, 4).map((item) => (
            <NavButton
              key={item.path}
              path={item.path}
              label={item.label}
              icon={item.icon}
              active={isActive(item.path)}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </nav>

      <OnboardingGuide />
    </div>
  )
}

export default Layout
