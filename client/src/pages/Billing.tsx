import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import PageHeader from '../components/PageHeader'
import api from '../api/client'
import PayjpForm from '../components/PayjpForm'
import { getAxiosErrorMessage } from '../utils/error'

interface Plan {
  id: number
  name: string
  display_name: string
  price_monthly: number
  max_dogs: number | null
  features: Record<string, unknown>
}

interface CurrentPlan {
  plan_name: string
  display_name: string
  price_monthly: number
  max_dogs: number | null
  current_dogs_count: number
  is_plan_limit_exceeded: boolean
  subscription_status: string
}

interface BillingHistory {
  id: number
  plan_name: string
  amount: number
  status: string
  billing_period_start: string
  billing_period_end: string
  paid_at: string
  created_at: string
}

type BillingTab = 'plan' | 'payment' | 'history'

const BILLING_TABS: { id: BillingTab; label: string }[] = [
  { id: 'plan', label: 'プラン' },
  { id: 'payment', label: 'お支払い方法' },
  { id: 'history', label: '請求履歴' },
]

function getStatusBadge(status: string): { label: string; className: string } {
  switch (status) {
    case 'paid':
      return { label: '支払済み', className: 'bg-chart-2/10 text-chart-2' }
    case 'failed':
      return { label: '失敗', className: 'bg-destructive/10 text-destructive' }
    default:
      return { label: '保留中', className: 'bg-muted text-muted-foreground' }
  }
}

export default function Billing() {
  const [activeTab, setActiveTab] = useState<BillingTab>('plan')
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null)
  const [billingHistory, setBillingHistory] = useState<BillingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [payjpPublicKey, setPayjpPublicKey] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null)
  const [processing, setProcessing] = useState(false)
  const [showCardForm, setShowCardForm] = useState(false)

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [plansRes, currentRes, keyRes] = await Promise.all([
        api.get('/billing/plans'),
        api.get('/billing/current'),
        api.get('/billing/payjp-key'),
      ])

      setPlans(plansRes.data || [])
      setCurrentPlan(currentRes.data)
      setPayjpPublicKey(keyRes.data.publicKey || '')

      if (activeTab === 'history') {
        const historyRes = await api.get('/billing/history')
        setBillingHistory(historyRes.data.history || [])
      }
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'プラン情報の取得に失敗しました'))
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = (planId: number) => {
    if (!confirm('プランを変更しますか？')) return
    setSelectedPlan(planId)
    setShowCardForm(true)
  }

  const handleTokenCreated = async (token: string) => {
    if (!selectedPlan) return

    setProcessing(true)
    try {
      await api.post('/billing/subscribe', {
        plan_id: selectedPlan,
        payjp_token: token,
      })

      alert('プランを変更しました')
      setShowCardForm(false)
      setSelectedPlan(null)
      fetchData()
    } catch (err) {
      alert(getAxiosErrorMessage(err, 'プラン変更に失敗しました'))
    } finally {
      setProcessing(false)
    }
  }

  const handleTokenError = (err: Error) => {
    alert(err.message || 'カード情報の処理に失敗しました')
    setProcessing(false)
  }

  const handleCancelSubscription = async () => {
    if (!confirm('サブスクリプションをキャンセルしますか？')) return

    try {
      await api.post('/billing/cancel')
      alert('サブスクリプションをキャンセルしました')
      fetchData()
    } catch (err) {
      alert(getAxiosErrorMessage(err, 'キャンセルに失敗しました'))
    }
  }

  if (loading && !currentPlan) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold" width="48" height="48" className="text-primary animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-6">
        <PageHeader title="プラン・お支払い" backPath="/settings" />
        <div className="px-5 pt-8 text-center">
          <Icon icon="solar:danger-triangle-bold" width="48" height="48" className="text-destructive mx-auto mb-4" />
          <p className="text-destructive font-bold mb-2">エラーが発生しました</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold"
          >
            再読み込み
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <PageHeader title="プラン・お支払い" backPath="/settings" />

      {/* タブ */}
      <div className="px-5 pt-4">
        <div className="flex gap-2 bg-muted/30 rounded-xl p-1">
          {BILLING_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors min-h-[48px] ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground font-normal'
              }`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* コンテンツ */}
      <div className="px-5 pt-4 space-y-4">
        {activeTab === 'plan' && (
          <>
            {currentPlan && (
              <section className="bg-card rounded-2xl border border-border shadow-sm p-5">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Icon icon="solar:card-bold" width="16" height="16" className="text-primary" />
                  現在のプラン
                </h3>
                <div className="bg-accent/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-accent-foreground">プラン名</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      currentPlan.subscription_status === 'active'
                        ? 'bg-chart-2/10 text-chart-2'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {currentPlan.subscription_status === 'active' ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </div>
                  <p className="text-lg font-bold mb-1">{currentPlan.display_name}</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    ¥{Math.floor(currentPlan.price_monthly ?? 0).toLocaleString()}/月（税込）
                  </p>
                  {currentPlan.max_dogs && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground">
                        登録可能頭数: {currentPlan.current_dogs_count} / {currentPlan.max_dogs}頭
                        {currentPlan.is_plan_limit_exceeded && (
                          <span className="text-destructive ml-2">⚠️ 上限超過</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                {currentPlan.subscription_status === 'active' && (
                  <button
                    onClick={handleCancelSubscription}
                    className="w-full mt-3 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm font-bold hover:bg-destructive/10 transition-colors"
                  >
                    サブスクリプションをキャンセル
                  </button>
                )}
              </section>
            )}

            <section className="bg-card rounded-2xl border border-border shadow-sm p-5">
              <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Icon icon="solar:tag-price-bold" width="16" height="16" className="text-primary" />
                プランを選択
              </h3>
              {plans.length === 0 ? (
                <div className="text-center py-8">
                  <Icon icon="solar:document-text-bold" width="48" height="48" className="text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground mb-2">プランが設定されていません</p>
                  <p className="text-xs text-muted-foreground">
                    管理者がデータベースにプランを登録する必要があります。
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {plans.map((plan) => (
                    <div
                      key={plan.id}
                      className={`border-2 rounded-xl p-4 ${
                        currentPlan?.plan_name === plan.name
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-base">{plan.display_name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            ¥{Math.floor(plan.price_monthly ?? 0).toLocaleString()}/月（税込）
                          </p>
                        </div>
                        {currentPlan?.plan_name === plan.name && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-bold">
                            現在のプラン
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        {plan.max_dogs ? `最大 ${plan.max_dogs}頭まで登録可能` : '無制限'}
                      </p>
                      {currentPlan?.plan_name !== plan.name && (
                        <button
                          onClick={() => handlePlanChange(plan.id)}
                          disabled={processing}
                          className="w-full mt-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 min-h-[48px]"
                        >
                          このプランに変更
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'payment' && (
          <section className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Icon icon="solar:card-bold" width="16" height="16" className="text-primary" />
              お支払い方法
            </h3>
            {showCardForm && payjpPublicKey ? (
              <div className="space-y-4">
                <PayjpForm
                  publicKey={payjpPublicKey}
                  onTokenCreated={handleTokenCreated}
                  onError={handleTokenError}
                  onSubmit={() => setProcessing(true)}
                />
                <button
                  onClick={() => {
                    setShowCardForm(false)
                    setSelectedPlan(null)
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm font-medium hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  お支払い方法の設定は、プラン変更時にカード情報を入力して設定できます。
                </p>
                <button
                  onClick={() => setActiveTab('plan')}
                  className="w-full px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition-colors"
                >
                  プランを変更してカードを設定
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Icon icon="solar:document-text-bold" width="16" height="16" className="text-primary" />
              請求履歴
            </h3>
            {billingHistory.length === 0 ? (
              <div className="text-center py-8">
                <Icon icon="solar:document-text-bold" width="48" height="48" className="text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">請求履歴がありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {billingHistory.map((item) => {
                  const badge = getStatusBadge(item.status)
                  return (
                    <div key={item.id} className="border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm">{item.plan_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.billing_period_start ? new Date(item.billing_period_start).toLocaleDateString('ja-JP') : '-'} 〜 {item.billing_period_end ? new Date(item.billing_period_end).toLocaleDateString('ja-JP') : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-base">¥{Math.floor(item.amount ?? 0).toLocaleString()}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                      {item.paid_at && (
                        <p className="text-xs text-muted-foreground">
                          支払日: {new Date(item.paid_at).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
