import { useState, useEffect, Suspense, lazy, useMemo, useCallback } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '../components/Icon'
import { useAuthStore } from '../store/authStore'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import BusinessTypeSwitcher from '../components/BusinessTypeSwitcher'

type TabId = 'store' | 'pricing' | 'integration' | 'other'

interface TabConfig {
  id: TabId
  label: string
  icon: string
  ownerOnly?: boolean
}

interface StoreInfo {
  name?: string | null
  address?: string | null
  phone?: string | null
  business_hours?: {
    open?: string | null
    close?: string | null
  } | null
  closed_days?: string[] | null
  business_types?: string[] | null
  primary_business_type?: string | null
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

function renderActiveTab(
  activeTab: TabId,
  storeInfo: StoreInfo | null,
  setStoreInfo: Dispatch<SetStateAction<StoreInfo | null>>,
  fetchStoreInfo: () => Promise<void>
) {
  switch (activeTab) {
    case 'store':
      return (
        <StoreTab
          storeInfo={storeInfo}
          setStoreInfo={setStoreInfo}
          fetchStoreInfo={fetchStoreInfo}
        />
      )
    case 'pricing':
      return <PricingTab />
    case 'integration':
      return <IntegrationTab />
    case 'other':
      return <OtherTab />
  }
}

function Settings() {
  const { user } = useAuthStore()
  const isOwner = user?.isOwner || false

  // 権限に応じて表示するタブをフィルタリング
  const TABS = useMemo(() => {
    return ALL_TABS.filter(tab => !tab.ownerOnly || isOwner)
  }, [isOwner])

  // デフォルトタブ（管理者はstore、それ以外はintegration）
  const defaultTab = isOwner ? 'store' : 'integration'
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)

  const { data: storeInfoData, mutate: mutateStoreInfo } = useSWR<StoreInfo>(
    isOwner ? '/stores' : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  // 権限変更時にタブをリセット
  useEffect(() => {
    const validTabs = TABS.map(t => t.id)
    if (!validTabs.includes(activeTab)) {
      setActiveTab(defaultTab)
    }
  }, [TABS, activeTab, defaultTab])

  useEffect(() => {
    if (storeInfoData) {
      setStoreInfo(storeInfoData)
    } else if (!isOwner) {
      setStoreInfo(null)
    }
  }, [storeInfoData, isOwner])

  const fetchStoreInfo = useCallback(async () => {
    await mutateStoreInfo()
  }, [mutateStoreInfo])

  return (
    <div className="pb-32">
      <header className="px-5 pt-6 pb-2 bg-background sticky top-0 z-10 safe-area-pt">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">設定</h1>
          <BusinessTypeSwitcher variant="pill" />
        </div>

        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 min-h-[52px] whitespace-nowrap active:scale-[0.98] ${
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

      <main className="flex-1 overflow-y-auto pb-24 px-5 space-y-4 pt-4">
        <Suspense fallback={<TabLoader />}>
          {renderActiveTab(activeTab, storeInfo, setStoreInfo, fetchStoreInfo)}
        </Suspense>
      </main>
    </div>
  )
}

export default Settings
