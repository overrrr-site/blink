import { useState, useCallback, useMemo, useEffect } from 'react'
import { Icon } from './Icon'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, selectUser } from '../store/authStore'
import { useBusinessTypeStore } from '../store/businessTypeStore'
import { getAvailableBusinessTypes, getEffectiveBusinessType } from '../utils/businessTypeAccess'
import { getRandomGreeting } from '../utils/greetings'
import { getRecordLabel } from '../utils/businessTypeColors'
import OnboardingGuide from './OnboardingGuide'
import BusinessTypeSwitcher from './BusinessTypeSwitcher'

const NAV_ITEMS = [
  { path: '/dashboard', label: '今日', icon: 'solar:calendar-mark-bold' },
  { path: '/reservations', label: '予定', icon: 'solar:calendar-bold' },
  { path: '/customers', label: '顧客', icon: 'solar:users-group-rounded-bold' },
  { path: '/settings', label: '設定', icon: 'solar:settings-bold' },
] as const

const FAB_ACTIONS_BASE = [
  { label: '予約を追加', icon: 'solar:calendar-add-bold', path: '/reservations/new', color: 'bg-chart-1' },
  { label: '顧客を登録', icon: 'solar:user-plus-bold', path: '/owners/new', color: 'bg-chart-2' },
  { labelKey: 'record', icon: 'solar:clipboard-add-bold', path: '/records/new', color: 'bg-chart-3' },
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
  const user = useAuthStore(selectUser)
  const { selectedBusinessType, syncFromUser } = useBusinessTypeStore()
  const [fabOpen, setFabOpen] = useState(false)
  const [greeting] = useState(() => getRandomGreeting())

  const availableBusinessTypes = useMemo(() => getAvailableBusinessTypes({
    storeBusinessTypes: user?.businessTypes,
    assignedBusinessTypes: user?.assignedBusinessTypes,
    isOwner: user?.isOwner,
  }), [user?.assignedBusinessTypes, user?.businessTypes, user?.isOwner])

  // 業種ストアの初期化
  useEffect(() => {
    syncFromUser({
      primaryType: user?.primaryBusinessType,
      availableTypes: availableBusinessTypes,
    })
  }, [availableBusinessTypes, syncFromUser, user?.primaryBusinessType])

  const effectiveBusinessType = getEffectiveBusinessType({
    selectedBusinessType,
    primaryBusinessType: user?.primaryBusinessType,
    availableBusinessTypes,
  })

  // 選択中の業種に応じたラベル（nullの場合はprimaryBusinessTypeを使用）
  const recordLabel = getRecordLabel(effectiveBusinessType)

  const fabActions = useMemo(() => FAB_ACTIONS_BASE.map(action => ({
    ...action,
    label: 'labelKey' in action ? `${recordLabel}を作成` : action.label,
  })), [recordLabel])

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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-xl focus:text-sm focus:font-bold"
      >
        メインコンテンツへスキップ
      </a>

      {isHomePage && (
        <header className="px-5 pt-4 pb-3 flex items-center justify-between bg-background sticky top-0 z-10 border-b border-border safe-area-pt">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-0.5">
              {new Date().toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short',
              })}
            </p>
            <h1 className="text-lg font-bold font-heading text-foreground leading-tight">
              <span className="whitespace-nowrap">{greeting}、</span>
              <span className="whitespace-nowrap">{user?.name || 'スタッフ'}さん</span>
            </h1>
          </div>
          <BusinessTypeSwitcher variant="pill" />
        </header>
      )}

      <main id="main-content" className="flex-1 overflow-y-auto pb-24">
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
        {fabActions.map((action, index) => (
          <button
            key={action.path}
            onClick={(e) => {
              e.stopPropagation()
              handleFabAction(action.path)
            }}
            className={`flex items-center gap-3 ${action.color} text-white pl-4 pr-5 py-3 rounded-full shadow-lg hover:scale-105 active:scale-[0.98] transition-transform min-h-[48px]`}
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
