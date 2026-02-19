import { useState } from 'react'
import useSWR from 'swr'
import axios from 'axios'
import { Icon } from '../../../components/Icon'
import { useToast } from '../../../components/Toast'
import api from '../../../api/client'
import { fetcher } from '../../../lib/swr'

interface StoreInfo {
  business_hours?: {
    open?: string | null
    close?: string | null
  } | null
  closed_days?: string[] | null
}

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default function BusinessHoursSection(): JSX.Element {
  const { showToast } = useToast()
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false)
  const [closedDays, setClosedDays] = useState<string[]>([])
  const [openTime, setOpenTime] = useState('09:00')
  const [closeTime, setCloseTime] = useState('18:00')

  const { data: storeInfo, mutate } = useSWR<StoreInfo>('/stores', fetcher)

  function openModal(): void {
    setClosedDays(Array.isArray(storeInfo?.closed_days) ? storeInfo?.closed_days : [])
    setOpenTime(storeInfo?.business_hours?.open || '09:00')
    setCloseTime(storeInfo?.business_hours?.close || '18:00')
    setShowBusinessHoursModal(true)
  }

  async function handleSave(): Promise<void> {
    try {
      await api.put('/stores', {
        business_hours: { open: openTime, close: closeTime },
        closed_days: closedDays,
      })
      await mutate()
      setShowBusinessHoursModal(false)
      showToast('営業日・定休日を保存しました', 'success')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || '営業日・定休日の保存に失敗しました', 'error')
    }
  }

  return (
    <>
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={openModal}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <Icon icon="solar:calendar-bold" width="20" height="20" className="text-muted-foreground" />
            <div className="text-left">
              <span className="text-sm font-medium block">営業日・定休日</span>
              <span className="text-[10px] text-muted-foreground">営業カレンダーの設定</span>
            </div>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </button>
      </section>

      {showBusinessHoursModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between safe-area-pt">
              <h2 className="text-lg font-bold">営業日・定休日</h2>
              <button
                onClick={() => setShowBusinessHoursModal(false)}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-all active:scale-95"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-2">定休日を選択</label>
                <div className="grid grid-cols-7 gap-2">
                  {DAY_LABELS.map((day, index) => {
                    const dayKey = DAY_KEYS[index]
                    const isClosed = closedDays.includes(dayKey)
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          setClosedDays((prev) => (
                            isClosed ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
                          ))
                        }}
                        className={`py-2 rounded-lg text-xs font-medium transition-all active:scale-[0.98] ${
                          isClosed
                            ? 'bg-destructive/10 text-destructive border border-destructive/30'
                            : 'bg-muted/50 text-muted-foreground border border-border'
                        }`}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">営業時間（定休日以外）</label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="text-sm text-muted-foreground">〜</span>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBusinessHoursModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-all active:scale-[0.98]"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
