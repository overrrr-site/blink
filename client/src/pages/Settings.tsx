import { useState, useEffect, Suspense, lazy } from 'react'
import api from '../api/client'

type TabId = 'store' | 'pricing' | 'integration' | 'other'

interface TabConfig {
  id: TabId
  label: string
  icon: string
}

const TABS: TabConfig[] = [
  { id: 'store', label: '店舗設定', icon: 'solar:shop-bold' },
  { id: 'pricing', label: '契約', icon: 'solar:tag-price-bold' },
  { id: 'integration', label: '連携', icon: 'solar:link-bold' },
  { id: 'other', label: 'その他', icon: 'solar:settings-bold' },
]

// タブコンポーネントを遅延ロード
const StoreTab = lazy(() => import('./settings/StoreTab'))
const PricingTab = lazy(() => import('./settings/PricingTab'))
const IntegrationTab = lazy(() => import('./settings/IntegrationTab'))
const OtherTab = lazy(() => import('./settings/OtherTab'))

const TabLoader = () => (
  <div className="flex items-center justify-center py-8">
    <iconify-icon icon="solar:spinner-bold" width="24" height="24" class="text-primary animate-spin"></iconify-icon>
  </div>
)

const Settings = () => {
  const [activeTab, setActiveTab] = useState<TabId>('store')
  const [storeInfo, setStoreInfo] = useState<any>(null)

  useEffect(() => {
    fetchStoreInfo()
  }, [])

  const fetchStoreInfo = async () => {
    try {
      const response = await api.get('/stores')
      setStoreInfo(response.data)
    } catch (error) {
      console.error('Error fetching store info:', error)
    }
  }

  return (
    <div className="pb-32">
      <header className="px-5 pt-6 pb-2 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold font-heading text-foreground mb-4">設定</h1>

        {/* タブナビゲーション */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 min-h-[48px] ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm border-b-2 border-primary'
                  : 'text-muted-foreground font-normal'
              }`}
              aria-pressed={activeTab === tab.id}
            >
              <iconify-icon icon={tab.icon} width="14" height="14"></iconify-icon>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-5 space-y-4 pt-4">
        <Suspense fallback={<TabLoader />}>
          {activeTab === 'store' && (
            <StoreTab
              storeInfo={storeInfo}
              setStoreInfo={setStoreInfo}
              fetchStoreInfo={fetchStoreInfo}
            />
          )}
          {activeTab === 'pricing' && <PricingTab />}
          {activeTab === 'integration' && <IntegrationTab />}
          {activeTab === 'other' && <OtherTab />}
        </Suspense>
      </main>
    </div>
  )
}

export default Settings
