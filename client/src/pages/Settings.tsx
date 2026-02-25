import { useEffect, Suspense, lazy, useMemo, useState } from 'react'
import { Icon } from '../components/Icon'
import { useAuthStore, selectUser } from '../store/authStore'
import BusinessTypeSwitcher from '../components/BusinessTypeSwitcher'

type TabId = 'store' | 'pricing' | 'integration' | 'other'

interface TabConfig {
  id: TabId
  label: string
  icon: string
  ownerOnly?: boolean
}

const ALL_TABS: TabConfig[] = [
  { id: 'store', label: '店舗設定', icon: 'solar:shop-bold', ownerOnly: true },
  { id: 'pricing', label: '料金', icon: 'solar:tag-price-bold', ownerOnly: true },
  { id: 'integration', label: '連携', icon: 'solar:link-bold' },
  { id: 'other', label: 'その他', icon: 'solar:settings-bold' },
]

const StoreTab = lazy(() => import('./settings/StoreTab'))
const PricingTab = lazy(() => import('./settings/PricingTab'))
const IntegrationTab = lazy(() => import('./settings/IntegrationTab'))
const OtherTab = lazy(() => import('./settings/OtherTab'))

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <Icon icon="solar:spinner-bold" width="24" height="24" className="text-primary animate-spin" />
    </div>
  )
}

function renderActiveTab(activeTab: TabId) {
  switch (activeTab) {
    case 'store':
      return <StoreTab />
    case 'pricing':
      return <PricingTab />
    case 'integration':
      return <IntegrationTab />
    case 'other':
      return <OtherTab />
  }
}

function Settings() {
  const user = useAuthStore(selectUser)
  const isOwner = user?.isOwner || false

  const tabs = useMemo(() => ALL_TABS.filter((tab) => !tab.ownerOnly || isOwner), [isOwner])
  const defaultTab: TabId = isOwner ? 'store' : 'integration'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  useEffect(() => {
    const validTabs = tabs.map((tab) => tab.id)
    if (!validTabs.includes(activeTab)) {
      setActiveTab(defaultTab)
    }
  }, [tabs, activeTab, defaultTab])

  return (
    <div className="pb-32">
      <header className="px-5 pt-6 pb-2 bg-background sticky top-0 z-10 safe-area-pt">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">設定</h1>
          <BusinessTypeSwitcher variant="pill" />
        </div>

        <div className="flex bg-muted rounded-xl p-1 gap-1 md:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 rounded-lg text-[11px] md:text-sm font-bold transition-all flex flex-col items-center justify-center gap-1 min-h-[52px] whitespace-nowrap active:scale-[0.98] ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm border-b-2 border-primary'
                  : 'text-muted-foreground font-normal'
              }`}
              aria-pressed={activeTab === tab.id}
            >
              <Icon icon={tab.icon} width="18" height="18" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-5 space-y-4 pt-4 lg:max-w-3xl">
        <Suspense fallback={<TabLoader />}>
          {renderActiveTab(activeTab)}
        </Suspense>
      </main>
    </div>
  )
}

export default Settings
