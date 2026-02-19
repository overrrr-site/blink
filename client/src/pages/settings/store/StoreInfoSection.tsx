import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from '@rc-component/qrcode'
import useSWR from 'swr'
import axios from 'axios'
import { Icon } from '../../../components/Icon'
import { useToast } from '../../../components/Toast'
import api from '../../../api/client'
import { fetcher } from '../../../lib/swr'
import { shallowEqualRecord } from './helpers'

interface StoreInfo {
  name?: string | null
  address?: string | null
  phone?: string | null
}

interface StoreSettings {
  max_capacity?: number
  grooming_default_duration?: number
}

interface QrCodeResponse {
  qrCode: string
}

interface StoreInfoSectionProps {
  isDaycareEnabled: boolean
  isGroomingEnabled: boolean
}

function normalizeStoreSettings(data?: StoreSettings): Required<StoreSettings> {
  return {
    max_capacity: data?.max_capacity ?? 15,
    grooming_default_duration: data?.grooming_default_duration ?? 60,
  }
}

export default function StoreInfoSection({
  isDaycareEnabled,
  isGroomingEnabled,
}: StoreInfoSectionProps): JSX.Element {
  const { showToast } = useToast()
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [storeSettings, setStoreSettings] = useState<Required<StoreSettings>>({
    max_capacity: 15,
    grooming_default_duration: 60,
  })
  const previousSettingsRef = useRef<Required<StoreSettings>>({
    max_capacity: 15,
    grooming_default_duration: 60,
  })

  const [qrLoading, setQrLoading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)

  const { data: storeInfo, mutate: mutateStoreInfo } = useSWR<StoreInfo>('/stores', fetcher)
  const { data: storeSettingsData } = useSWR<StoreSettings>('/store-settings', fetcher)
  const {
    data: qrData,
    isLoading: qrLoadingData,
    mutate: mutateQrCode,
  } = useSWR<QrCodeResponse>('/liff/qr-code', fetcher)

  const qrCode = qrData?.qrCode ?? null
  const isQrLoading = qrLoading || qrLoadingData

  useEffect(() => {
    if (!storeSettingsData) return
    const normalized = normalizeStoreSettings(storeSettingsData)
    setStoreSettings(normalized)
    previousSettingsRef.current = normalized
  }, [storeSettingsData])

  const settingsPayload = useMemo(() => ({
    max_capacity: storeSettings.max_capacity,
    grooming_default_duration: storeSettings.grooming_default_duration,
  }), [storeSettings])

  useEffect(() => {
    if (!storeSettingsData) return
    if (shallowEqualRecord(settingsPayload, previousSettingsRef.current)) return

    const timer = setTimeout(async () => {
      try {
        await api.put('/store-settings', settingsPayload)
        previousSettingsRef.current = settingsPayload
      } catch (error: unknown) {
        const message = axios.isAxiosError(error)
          ? (error.response?.data as { error?: string } | undefined)?.error
          : null
        showToast(message || '設定の保存に失敗しました', 'error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [settingsPayload, showToast, storeSettingsData])

  async function handleSaveStoreInfo(): Promise<void> {
    try {
      await api.put('/stores', form)
      await mutateStoreInfo()
      setShowStoreInfoModal(false)
      showToast('店舗情報を保存しました', 'success')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || '店舗情報の保存に失敗しました', 'error')
    }
  }

  function openStoreInfoModal(): void {
    setForm({
      name: storeInfo?.name || '',
      address: storeInfo?.address || '',
      phone: storeInfo?.phone || '',
    })
    setShowStoreInfoModal(true)
  }

  async function fetchQrCode(): Promise<void> {
    setQrLoading(true)
    try {
      await mutateQrCode()
    } finally {
      setQrLoading(false)
    }
  }

  function handlePrintQrCode(): void {
    if (!qrCode) return

    const qrSvg = document.querySelector('#qr-display-modal svg') || document.querySelector('#qr-display svg')
    if (!qrSvg) {
      showToast('QRコードが見つかりません', 'error')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showToast('ポップアップがブロックされています。ブラウザの設定を確認してください。', 'error')
      return
    }

    const svgClone = qrSvg.cloneNode(true) as SVGElement
    const svgString = new XMLSerializer().serializeToString(svgClone)

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>登園用QRコード</title>
          <style>
            @media print {
              @page { margin: 20mm; }
              body { margin: 0; padding: 0; }
            }
            body {
              margin: 0;
              padding: 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: sans-serif;
              min-height: 100vh;
            }
            h1 { margin-bottom: 20px; font-size: 24px; }
            .qr-container {
              background: white;
              padding: 20px;
              border: 2px solid #000;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .instructions {
              margin-top: 20px;
              text-align: center;
              font-size: 14px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <h1>登園用QRコード</h1>
          <div class="qr-container">${svgString}</div>
          <p class="instructions">飼い主にこのQRコードをスキャンしてもらってください</p>
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); };</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <>
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:shop-bold" width="16" height="16" className="text-primary" />
            店舗情報
          </h2>
        </div>
        <button
          onClick={openStoreInfoModal}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-all active:scale-[0.98] border-b border-border"
        >
          <div className="flex items-center gap-3">
            <Icon icon="solar:buildings-bold" width="20" height="20" className="text-muted-foreground" />
            <div className="text-left">
              <span className="text-sm font-medium block">基本情報</span>
              <span className="text-[10px] text-muted-foreground">店舗名、住所、電話番号</span>
            </div>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </button>

        {isDaycareEnabled && (
          <div className={`w-full flex items-center justify-between p-4 ${isGroomingEnabled ? 'border-b border-border' : ''}`}>
            <div className="flex items-center gap-3">
              <Icon icon="solar:users-group-rounded-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium block">受入可能頭数</span>
                </div>
                <span className="text-[10px] text-muted-foreground">1日あたりの受入上限</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={storeSettings.max_capacity}
                onChange={(e) => setStoreSettings((prev) => ({
                  ...prev,
                  max_capacity: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                }))}
                min="1"
                className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              />
              <span className="text-sm font-bold text-primary">頭</span>
            </div>
          </div>
        )}

        {isGroomingEnabled && (
          <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <span className="text-sm font-medium block">デフォルト施術時間</span>
                <span className="text-[10px] text-muted-foreground">予約時のデフォルト時間</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={storeSettings.grooming_default_duration}
                onChange={(e) => setStoreSettings((prev) => ({
                  ...prev,
                  grooming_default_duration: Math.max(15, Number.parseInt(e.target.value, 10) || 60),
                }))}
                min="15"
                step="15"
                className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
              />
              <span className="text-sm font-bold text-primary">分</span>
            </div>
          </div>
        )}
      </section>

      {isDaycareEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setQrExpanded(!qrExpanded)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-all active:scale-[0.99]"
          >
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:qr-code-bold" width="16" height="16" className="text-primary" />
              登園用QRコード
            </h2>
            <Icon
              icon={qrExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
              width="20"
              height="20"
              className="text-muted-foreground"
            />
          </button>
          {qrExpanded && (
            <div className="p-4 border-t border-border">
              {isQrLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Icon icon="solar:spinner-bold" width="24" height="24" className="text-primary animate-spin" />
                </div>
              ) : qrCode ? (
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center">
                    <div id="qr-display" className="bg-white p-4 rounded-lg mb-3">
                      <QRCodeSVG value={qrCode} size={200} />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      このQRコードを印刷して店舗に設置してください
                    </p>
                  </div>
                  <button
                    onClick={handlePrintQrCode}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-all active:scale-[0.98] text-sm font-bold hover:bg-primary/90"
                  >
                    <Icon icon="solar:printer-bold" width="16" height="16" />
                    QRコードを印刷
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-all active:scale-[0.98] text-sm font-medium"
                  >
                    <Icon icon="solar:eye-bold" width="16" height="16" />
                    大きく表示
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    QRコードの取得に失敗しました
                  </p>
                  <button
                    onClick={fetchQrCode}
                    disabled={isQrLoading}
                    className="text-xs text-primary hover:underline disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {showStoreInfoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between safe-area-pt">
              <h2 className="text-lg font-bold">店舗基本情報</h2>
              <button
                onClick={() => setShowStoreInfoModal(false)}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-all active:scale-95"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">店舗名</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">住所</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">電話番号</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStoreInfoModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-all active:scale-[0.98]"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSaveStoreInfo}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showQrModal && qrCode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">登園用QRコード</h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-all active:scale-95"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div id="qr-display-modal" className="bg-white p-6 rounded-lg flex items-center justify-center">
                <QRCodeSVG value={qrCode} size={300} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                このQRコードを印刷して店舗に設置してください
              </p>
              <button
                onClick={handlePrintQrCode}
                className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-all active:scale-[0.98] text-sm font-bold hover:bg-primary/90"
              >
                <Icon icon="solar:printer-bold" width="16" height="16" />
                印刷
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
