import { useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from '@rc-component/qrcode'
import axios from 'axios'
import useSWR from 'swr'
import api from '../../api/client'
import { fetcher } from '../../lib/swr'
import { useAuthStore } from '../../store/authStore'
import { useBusinessTypeStore } from '../../store/businessTypeStore'
import { getBusinessTypeLabel, getBusinessTypeIcon, getBusinessTypeColors } from '../../utils/businessTypeColors'
import type { RecordType } from '../../types/record'

interface StoreTabProps {
  storeInfo: StoreInfo | null
  setStoreInfo: Dispatch<SetStateAction<StoreInfo | null>>
  fetchStoreInfo: () => Promise<void>
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

interface StoreInfoPayload {
  name?: string
  address?: string
  phone?: string
}

interface BusinessHoursPayload {
  open: string
  close: string
}

interface StoreSettings {
  max_capacity: number
  ai_assistant_enabled?: boolean
  ai_store_data_contribution?: boolean
  ai_service_improvement?: boolean
  // トリミング設定
  grooming_default_duration?: number
  // ホテル設定
  hotel_room_count?: number
  hotel_checkin_time?: string
  hotel_checkout_time?: string
}

interface GroomingMenuItem {
  id: number
  menu_name: string
  description?: string
  price?: number
  duration_minutes?: number
  dog_size?: string
  display_order: number
}

interface HotelPriceItem {
  id?: number
  dog_size: string
  price_per_night: number
  description?: string
}

interface StaffItem {
  id: number
  name: string
  email: string
  is_owner?: boolean | null
}

interface TrainingItem {
  id: number
  item_label: string
  display_order: number
}

type TrainingMasters = Record<string, TrainingItem[]>

interface QrCodeResponse {
  qrCode: string
}

const ALL_BUSINESS_TYPES: RecordType[] = ['daycare', 'grooming', 'hotel']

function StoreTab({ storeInfo, setStoreInfo, fetchStoreInfo }: StoreTabProps): JSX.Element {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { selectedBusinessType } = useBusinessTypeStore()
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ max_capacity: 15 })
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false)
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false)
  const [showStaffInviteModal, setShowStaffInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteIsOwner, setInviteIsOwner] = useState(false)
  const [inviteBusinessTypes, setInviteBusinessTypes] = useState<RecordType[]>([])
  const [inviting, setInviting] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrExpanded, setQrExpanded] = useState(false)
  const [localHotelPrices, setLocalHotelPrices] = useState<HotelPriceItem[]>([])
  const [hotelPricesInitialized, setHotelPricesInitialized] = useState(false)

  // 店舗で利用可能な業種
  const storeBusinessTypes = (user?.businessTypes || []) as RecordType[]
  // 各業態が有効かどうか
  const isDaycareEnabled = selectedBusinessType === 'daycare' || (selectedBusinessType === null && storeBusinessTypes.includes('daycare'))
  const isGroomingEnabled = selectedBusinessType === 'grooming' || (selectedBusinessType === null && storeBusinessTypes.includes('grooming'))
  const isHotelEnabled = selectedBusinessType === 'hotel' || (selectedBusinessType === null && storeBusinessTypes.includes('hotel'))

  const {
    data: storeSettingsData,
    isLoading: loadingStoreSettings,
  } = useSWR<StoreSettings>('/store-settings', fetcher, { revalidateOnFocus: false })

  const {
    data: staffList,
    isLoading: loadingStaff,
    mutate: mutateStaff,
  } = useSWR<StaffItem[]>('/staff', fetcher, { revalidateOnFocus: false })

  const {
    data: trainingMasters,
    isLoading: loadingTraining,
    mutate: mutateTrainingMasters,
  } = useSWR<TrainingMasters>('/training-masters', fetcher, { revalidateOnFocus: false })

  const {
    data: qrData,
    isLoading: qrLoadingData,
    mutate: mutateQrCode,
  } = useSWR<QrCodeResponse>('/liff/qr-code', fetcher, { revalidateOnFocus: false })

  // トリミングメニュー一覧
  const {
    data: groomingMenus,
    isLoading: loadingGroomingMenus,
    mutate: mutateGroomingMenus,
  } = useSWR<GroomingMenuItem[]>(isGroomingEnabled ? '/grooming-menus' : null, fetcher, { revalidateOnFocus: false })

  // ホテル料金一覧
  const {
    data: hotelPrices,
    isLoading: loadingHotelPrices,
    mutate: mutateHotelPrices,
  } = useSWR<HotelPriceItem[]>(isHotelEnabled ? '/hotel-prices' : null, fetcher, { revalidateOnFocus: false })

  useEffect(() => {
    if (storeSettingsData) {
      setStoreSettings(storeSettingsData)
    }
  }, [storeSettingsData])

  const handleStoreSettingsChange = (field: keyof StoreSettings, value: number | string | boolean) => {
    setStoreSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // 店舗設定の保存
  const saveStoreSettings = async (settings: StoreSettings) => {
    try {
      await api.put('/store-settings', settings)
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || '設定の保存に失敗しました')
    }
  }

  // 設定変更時に自動保存（デバウンス）
  useEffect(() => {
    if (!storeSettingsData) return
    const timer = setTimeout(() => {
      // 初期データと異なる場合のみ保存
      const hasChanges = JSON.stringify(storeSettings) !== JSON.stringify(storeSettingsData)
      if (hasChanges) {
        saveStoreSettings(storeSettings)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [storeSettings, storeSettingsData])

  const handleDeleteStaff = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このスタッフを削除しますか？')) {
      return
    }

    try {
      await api.delete(`/staff/${id}`)
      mutateStaff()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || 'スタッフの削除に失敗しました')
    }
  }

  const handleInviteStaff = async () => {
    if (!inviteEmail || !inviteName) {
      alert('メールアドレスと名前を入力してください')
      return
    }

    setInviting(true)
    try {
      // 管理者の場合はnull（全業種アクセス）、スタッフの場合は選択した業種
      const assignedBusinessTypes = inviteIsOwner ? null : (inviteBusinessTypes.length > 0 ? inviteBusinessTypes : null)
      await api.post('/auth/invite', {
        email: inviteEmail,
        name: inviteName,
        is_owner: inviteIsOwner,
        assigned_business_types: assignedBusinessTypes,
      })
      alert(`${inviteEmail} に招待メールを送信しました`)
      setShowStaffInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInviteIsOwner(false)
      setInviteBusinessTypes([])
      mutateStaff()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || 'スタッフの招待に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  const handleDeleteTrainingItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このトレーニング項目を削除しますか？')) {
      return
    }

    try {
      await api.delete(`/training-masters/${id}`)
      mutateTrainingMasters()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || 'トレーニング項目の削除に失敗しました')
    }
  }

  const handleReorderTrainingItem = async (category: string, itemId: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation()

    const items = trainingMasters?.[category]
    if (!items) return

    const currentIndex = items.findIndex((item) => item.id === itemId)
    if (currentIndex === -1) return

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= items.length) return

    const currentItem = items[currentIndex]
    const targetItem = items[newIndex]

    try {
      await Promise.all([
        api.put(`/training-masters/${currentItem.id}`, { display_order: targetItem.display_order }),
        api.put(`/training-masters/${targetItem.id}`, { display_order: currentItem.display_order }),
      ])
      mutateTrainingMasters()
    } catch {
      alert('トレーニング項目の並び替えに失敗しました')
    }
  }

  const qrCode = qrData?.qrCode ?? null
  const isQrLoading = qrLoading || qrLoadingData
  const resolvedStaffList = staffList ?? []
  const resolvedTrainingMasters = trainingMasters ?? {}
  const resolvedGroomingMenus = groomingMenus ?? []
  const resolvedHotelPrices = hotelPrices ?? []

  // ホテル料金のデフォルト値（全サイズ）
  const defaultHotelPrices: HotelPriceItem[] = [
    { dog_size: '小型', price_per_night: 0 },
    { dog_size: '中型', price_per_night: 0 },
    { dog_size: '大型', price_per_night: 0 },
  ]

  // ホテル料金の初期化
  useEffect(() => {
    if (resolvedHotelPrices.length > 0 && !hotelPricesInitialized) {
      const merged = defaultHotelPrices.map(dp => {
        const existing = resolvedHotelPrices.find(hp => hp.dog_size === dp.dog_size)
        return existing || dp
      })
      setLocalHotelPrices(merged)
      setHotelPricesInitialized(true)
    } else if (resolvedHotelPrices.length === 0 && !hotelPricesInitialized && !loadingHotelPrices) {
      setLocalHotelPrices(defaultHotelPrices)
      setHotelPricesInitialized(true)
    }
  }, [resolvedHotelPrices, hotelPricesInitialized, loadingHotelPrices])

  const displayHotelPrices = localHotelPrices.length > 0 ? localHotelPrices : defaultHotelPrices

  const fetchQrCode = async () => {
    setQrLoading(true)
    try {
      await mutateQrCode()
    } finally {
      setQrLoading(false)
    }
  }

  // トリミングメニュー削除
  const handleDeleteGroomingMenu = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このメニューを削除しますか？')) {
      return
    }

    try {
      await api.delete(`/grooming-menus/${id}`)
      mutateGroomingMenus()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || 'メニューの削除に失敗しました')
    }
  }

  // ホテル料金保存
  const handleSaveHotelPrices = async (prices: HotelPriceItem[]) => {
    try {
      await api.put('/hotel-prices', { prices })
      mutateHotelPrices()
      alert('ホテル料金を保存しました')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || 'ホテル料金の保存に失敗しました')
    }
  }

  const handlePrintQrCode = () => {
    if (!qrCode) return

    const qrSvg = document.querySelector('#qr-display-modal svg') || document.querySelector('#qr-display svg')
    if (!qrSvg) {
      alert('QRコードが見つかりません')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('ポップアップがブロックされています。ブラウザの設定を確認してください。')
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

  const handleSaveStoreInfo = async (data: StoreInfoPayload) => {
    try {
      await api.put('/stores', data)
      fetchStoreInfo()
      setShowStoreInfoModal(false)
      alert('店舗情報を保存しました')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || '店舗情報の保存に失敗しました')
    }
  }

  const handleSaveBusinessHours = async (businessHours: BusinessHoursPayload, closedDays: string[]) => {
    try {
      await api.put('/stores', {
        business_hours: businessHours,
        closed_days: closedDays,
      })
      fetchStoreInfo()
      setShowBusinessHoursModal(false)
      alert('営業日・定休日を保存しました')
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      alert(message || '営業日・定休日の保存に失敗しました')
    }
  }

  return (
    <>
      {/* 店舗情報 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:shop-bold" width="16" height="16" className="text-primary" />
            店舗情報
          </h2>
        </div>
        <button
          onClick={() => setShowStoreInfoModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
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
        <button
          onClick={() => setShowBusinessHoursModal(true)}
          className={`w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${isDaycareEnabled ? 'border-b border-border' : ''}`}
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
        {/* 受入可能頭数（幼稚園のみ） */}
        {isDaycareEnabled && (
          <div className="w-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Icon icon="solar:users-group-rounded-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium block">受入可能頭数</span>
                  <div className="relative group">
                    <Icon icon="solar:question-circle-bold"
                      width="14" height="14" className="text-muted-foreground cursor-help" />
                    <div className="absolute left-0 top-5 w-56 p-3 bg-foreground text-background text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                      1日あたりの予約受入上限数です。この数を超える予約は登録できません。
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">1日あたりの受入上限</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingStoreSettings ? (
                <span className="text-sm text-muted-foreground">読み込み中...</span>
              ) : (
                <>
                  <input
                    type="number"
                    value={storeSettings.max_capacity}
                    onChange={(e) => handleStoreSettingsChange('max_capacity', parseInt(e.target.value, 10))}
                    min="1"
                    className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                  />
                  <span className="text-sm font-bold text-primary">頭</span>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 登園用QRコード（幼稚園のみ） */}
      {isDaycareEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            onClick={() => setQrExpanded(!qrExpanded)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:qr-code-bold" width="16" height="16" className="text-primary" />
              登園用QRコード
            </h2>
            <Icon icon={qrExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"}
              width="20"
              height="20"
              className="text-muted-foreground" />
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
                    className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-colors text-sm font-bold hover:bg-primary/90"
                  >
                    <Icon icon="solar:printer-bold" width="16" height="16" />
                    QRコードを印刷
                  </button>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium"
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
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    再試行
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* スタッフ管理 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:user-id-bold" width="16" height="16" className="text-chart-3" />
            スタッフ管理
          </h2>
          <button
            onClick={() => setShowStaffInviteModal(true)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <Icon icon="solar:add-circle-bold" width="14" height="14" />
            追加
          </button>
        </div>
        {loadingStaff ? (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        ) : resolvedStaffList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Icon icon="solar:user-id-bold" width="48" height="48" className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">スタッフが登録されていません</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {resolvedStaffList.map((staff) => (
              <div
                key={staff.id}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors group"
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
                  <span className="text-sm font-bold text-primary">
                    {staff.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div
                  className="flex-1 text-left cursor-pointer"
                  onClick={() => navigate(`/settings/staff/${staff.id}`)}
                >
                  <span className="text-sm font-medium block">{staff.name}</span>
                  <span className="text-[10px] text-muted-foreground">{staff.email}</span>
                </div>
                {staff.is_owner && (
                  <span className="text-[10px] bg-chart-2/10 text-chart-2 px-2.5 py-1 rounded-full font-bold border border-chart-2/20">
                    管理者
                  </span>
                )}
                <button
                  onClick={() => navigate(`/settings/staff/${staff.id}`)}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label={`${staff.name}の詳細`}
                >
                  <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => handleDeleteStaff(staff.id, e)}
                  className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                  aria-label={`${staff.name}を削除`}
                >
                  <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* トレーニング項目（幼稚園のみ） */}
      {isDaycareEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:checklist-bold" width="16" height="16" className="text-chart-2" />
              トレーニング項目
            </h2>
            <button
              onClick={() => navigate('/settings/training/new')}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              <Icon icon="solar:add-circle-bold" width="14" height="14" />
              追加
            </button>
          </div>
          {loadingTraining ? (
            <div className="text-center py-4">
              <span className="text-xs text-muted-foreground">読み込み中...</span>
            </div>
          ) : Object.keys(resolvedTrainingMasters).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="solar:checklist-bold" width="48" height="48" className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">トレーニング項目が登録されていません</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(resolvedTrainingMasters).map(([category, items]) => (
                <div key={category} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold">{category}</h3>
                    <span className="text-[10px] text-muted-foreground">{items.length}項目</span>
                  </div>
                  <div className="space-y-1">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg group"
                      >
                        <span className="text-xs text-muted-foreground flex-1">{item.item_label}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => handleReorderTrainingItem(category, item.id, 'up', e)}
                            disabled={index === 0}
                            className="p-1.5 text-muted-foreground rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`${item.item_label}を上に移動`}
                          >
                            <Icon icon="solar:alt-arrow-up-linear" width="14" height="14" />
                          </button>
                          <button
                            onClick={(e) => handleReorderTrainingItem(category, item.id, 'down', e)}
                            disabled={index === items.length - 1}
                            className="p-1.5 text-muted-foreground rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label={`${item.item_label}を下に移動`}
                          >
                            <Icon icon="solar:alt-arrow-down-linear" width="14" height="14" />
                          </button>
                          <button
                            onClick={() => navigate(`/settings/training/${item.id}`)}
                            className="p-1.5 text-muted-foreground rounded hover:bg-muted transition-colors"
                            aria-label={`${item.item_label}を編集`}
                          >
                            <Icon icon="solar:pen-bold" width="14" height="14" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTrainingItem(item.id, e)}
                            className="p-1.5 text-destructive rounded hover:bg-destructive/10 transition-colors"
                            aria-label={`${item.item_label}を削除`}
                          >
                            <Icon icon="solar:trash-bin-minimalistic-bold" width="14" height="14" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
      )}

      {/* トリミング設定（トリミングのみ） */}
      {isGroomingEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:scissors-bold" width="16" height="16" className="text-chart-4" />
              トリミング設定
            </h2>
          </div>
          {/* デフォルト施術時間 */}
          <div className="w-full flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium block">デフォルト施術時間</span>
                  <div className="relative group">
                    <Icon icon="solar:question-circle-bold"
                      width="14" height="14" className="text-muted-foreground cursor-help" />
                    <div className="absolute left-0 top-5 w-56 p-3 bg-foreground text-background text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                      予約作成時のデフォルトの施術時間です。メニューごとに個別設定も可能です。
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground">予約時のデフォルト時間</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingStoreSettings ? (
                <span className="text-sm text-muted-foreground">読み込み中...</span>
              ) : (
                <>
                  <input
                    type="number"
                    value={storeSettings.grooming_default_duration || 60}
                    onChange={(e) => handleStoreSettingsChange('grooming_default_duration', parseInt(e.target.value, 10))}
                    min="15"
                    step="15"
                    className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                  />
                  <span className="text-sm font-bold text-primary">分</span>
                </>
              )}
            </div>
          </div>
          {/* 施術メニュー一覧 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">施術メニュー</span>
              <button
                onClick={() => navigate('/settings/grooming-menu/new')}
                className="text-xs font-bold text-primary flex items-center gap-1"
              >
                <Icon icon="solar:add-circle-bold" width="14" height="14" />
                追加
              </button>
            </div>
            {loadingGroomingMenus ? (
              <div className="text-center py-4">
                <span className="text-xs text-muted-foreground">読み込み中...</span>
              </div>
            ) : resolvedGroomingMenus.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-xl">
                <Icon icon="solar:scissors-bold" width="32" height="32" className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">メニューが登録されていません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resolvedGroomingMenus.map((menu) => (
                  <div
                    key={menu.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{menu.menu_name}</span>
                        {menu.dog_size && menu.dog_size !== '全サイズ' && (
                          <span className="text-[10px] bg-chart-4/10 text-chart-4 px-1.5 py-0.5 rounded font-medium">
                            {menu.dog_size}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {menu.price !== undefined && menu.price !== null && (
                          <span className="text-xs text-muted-foreground">¥{menu.price.toLocaleString()}</span>
                        )}
                        {menu.duration_minutes && (
                          <span className="text-xs text-muted-foreground">{menu.duration_minutes}分</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/settings/grooming-menu/${menu.id}`)}
                        className="p-2 text-muted-foreground rounded-full hover:bg-muted transition-colors"
                        aria-label={`${menu.menu_name}を編集`}
                      >
                        <Icon icon="solar:pen-bold" width="16" height="16" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteGroomingMenu(menu.id, e)}
                        className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                        aria-label={`${menu.menu_name}を削除`}
                      >
                        <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ホテル設定（ホテルのみ） */}
      {isHotelEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:sleeping-square-bold" width="16" height="16" className="text-chart-5" />
              ホテル設定
            </h2>
          </div>
          {/* 部屋/ケージ数 */}
          <div className="w-full flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Icon icon="solar:home-2-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <span className="text-sm font-medium block">部屋/ケージ数</span>
                <span className="text-[10px] text-muted-foreground">お預かり可能な部屋数</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingStoreSettings ? (
                <span className="text-sm text-muted-foreground">読み込み中...</span>
              ) : (
                <>
                  <input
                    type="number"
                    value={storeSettings.hotel_room_count || 10}
                    onChange={(e) => handleStoreSettingsChange('hotel_room_count', parseInt(e.target.value, 10))}
                    min="1"
                    className="w-24 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                  />
                  <span className="text-sm font-bold text-primary">室</span>
                </>
              )}
            </div>
          </div>
          {/* チェックイン/アウト時間 */}
          <div className="w-full flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <span className="text-sm font-medium block">チェックイン時間</span>
                <span className="text-[10px] text-muted-foreground">デフォルトの受付開始時間</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingStoreSettings ? (
                <span className="text-sm text-muted-foreground">読み込み中...</span>
              ) : (
                <input
                  type="time"
                  value={storeSettings.hotel_checkin_time || '10:00'}
                  onChange={(e) => {
                    setStoreSettings(prev => ({ ...prev, hotel_checkin_time: e.target.value }))
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                />
              )}
            </div>
          </div>
          <div className="w-full flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-muted-foreground" />
              <div className="text-left flex-1">
                <span className="text-sm font-medium block">チェックアウト時間</span>
                <span className="text-[10px] text-muted-foreground">デフォルトのお迎え時間</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingStoreSettings ? (
                <span className="text-sm text-muted-foreground">読み込み中...</span>
              ) : (
                <input
                  type="time"
                  value={storeSettings.hotel_checkout_time || '18:00'}
                  onChange={(e) => {
                    setStoreSettings(prev => ({ ...prev, hotel_checkout_time: e.target.value }))
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                />
              )}
            </div>
          </div>
          {/* 1泊料金（サイズ別） */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium">1泊料金（税込）</span>
            </div>
            {loadingHotelPrices ? (
              <div className="text-center py-4">
                <span className="text-xs text-muted-foreground">読み込み中...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {displayHotelPrices.map((price, index) => (
                  <div
                    key={price.dog_size}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl"
                  >
                    <span className="text-sm font-medium w-12">{price.dog_size}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">¥</span>
                      <input
                        type="number"
                        value={price.price_per_night}
                        onChange={(e) => {
                          const newPrices = [...displayHotelPrices]
                          newPrices[index] = { ...newPrices[index], price_per_night: parseInt(e.target.value, 10) || 0 }
                          setLocalHotelPrices(newPrices)
                        }}
                        min="0"
                        step="100"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => handleSaveHotelPrices(localHotelPrices)}
                  className="w-full mt-3 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  料金を保存
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 店舗基本情報編集モーダル */}
      {showStoreInfoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">店舗基本情報</h2>
              <button
                onClick={() => setShowStoreInfoModal(false)}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
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
                  defaultValue={storeInfo?.name || ''}
                  id="store-name"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">住所</label>
                <textarea
                  defaultValue={storeInfo?.address || ''}
                  id="store-address"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">電話番号</label>
                <input
                  type="tel"
                  defaultValue={storeInfo?.phone || ''}
                  id="store-phone"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowStoreInfoModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    const name = (document.getElementById('store-name') as HTMLInputElement)?.value
                    const address = (document.getElementById('store-address') as HTMLTextAreaElement)?.value
                    const phone = (document.getElementById('store-phone') as HTMLInputElement)?.value
                    handleSaveStoreInfo({ name, address, phone })
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 営業日・定休日編集モーダル */}
      {showBusinessHoursModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">営業日・定休日</h2>
              <button
                onClick={() => setShowBusinessHoursModal(false)}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-2">定休日を選択</label>
                <div className="grid grid-cols-7 gap-2">
                  {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => {
                    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][index]
                    const closedDays = storeInfo?.closed_days || []
                    const isClosed = Array.isArray(closedDays) ? closedDays.includes(dayKey) : false
                    return (
                      <button
                        key={day}
                        onClick={() => {
                          const currentClosed = Array.isArray(closedDays) ? [...closedDays] : []
                          const newClosed = isClosed
                            ? currentClosed.filter((d: string) => d !== dayKey)
                            : [...currentClosed, dayKey]
                          setStoreInfo((prev) => ({ ...(prev ?? {}), closed_days: newClosed }))
                        }}
                        className={`py-2 rounded-lg text-xs font-medium transition-colors ${
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      defaultValue={storeInfo?.business_hours?.open || '09:00'}
                      id="business-open"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <span className="text-sm text-muted-foreground">〜</span>
                    <input
                      type="time"
                      defaultValue={storeInfo?.business_hours?.close || '18:00'}
                      id="business-close"
                      className="flex-1 px-3 py-2 rounded-lg border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBusinessHoursModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={() => {
                    const open = (document.getElementById('business-open') as HTMLInputElement)?.value
                    const close = (document.getElementById('business-close') as HTMLInputElement)?.value
                    const closedDays = storeInfo?.closed_days || []
                    handleSaveBusinessHours({ open, close }, Array.isArray(closedDays) ? closedDays : [])
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* スタッフ招待モーダル */}
      {showStaffInviteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">スタッフを招待</h2>
              <button
                onClick={() => {
                  setShowStaffInviteModal(false)
                  setInviteEmail('')
                  setInviteName('')
                  setInviteIsOwner(false)
                  setInviteBusinessTypes([])
                }}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-bold" width="24" height="24" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-accent/30 rounded-xl p-3 flex items-start gap-2">
                <Icon icon="solar:info-circle-bold" width="16" height="16" className="text-accent-foreground mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  入力したメールアドレス宛に招待メールが送信されます。招待されたスタッフはメールのリンクからパスワードを設定してログインできます。
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">スタッフ名</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="山田 太郎"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="staff@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-2">権限</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteIsOwner(false)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${
                      !inviteIsOwner
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/50'
                    }`}
                  >
                    スタッフ
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteIsOwner(true)}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors border ${
                      inviteIsOwner
                        ? 'bg-chart-2 text-white border-chart-2'
                        : 'bg-muted/50 text-muted-foreground border-border hover:border-chart-2/50'
                    }`}
                  >
                    管理者
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  管理者は設定、料金管理、スタッフ管理ができます
                </p>
              </div>
              {/* 業種選択（スタッフの場合のみ表示） */}
              {!inviteIsOwner && storeBusinessTypes.length > 1 && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">担当業種</label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_BUSINESS_TYPES.filter(type => storeBusinessTypes.includes(type)).map((type) => {
                      const colors = getBusinessTypeColors(type)
                      const isSelected = inviteBusinessTypes.includes(type)
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setInviteBusinessTypes(prev =>
                              isSelected ? prev.filter(t => t !== type) : [...prev, type]
                            )
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                            isSelected
                              ? 'border-2'
                              : 'border-border hover:border-primary/30'
                          }`}
                          style={isSelected ? {
                            backgroundColor: colors.pale,
                            borderColor: colors.primary,
                            color: colors.primary,
                          } : undefined}
                        >
                          <Icon icon={getBusinessTypeIcon(type)} width="14" height="14" />
                          {getBusinessTypeLabel(type)}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {inviteBusinessTypes.length === 0
                      ? '未選択の場合は全業種にアクセスできます'
                      : `${inviteBusinessTypes.map(t => getBusinessTypeLabel(t)).join('、')}のみアクセス可能`}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStaffInviteModal(false)
                    setInviteEmail('')
                    setInviteName('')
                    setInviteIsOwner(false)
                    setInviteBusinessTypes([])
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleInviteStaff}
                  disabled={inviting || !inviteEmail || !inviteName}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {inviting ? '送信中...' : '招待メールを送信'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QRコード拡大表示モーダル */}
      {showQrModal && qrCode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">登園用QRコード</h2>
              <button
                onClick={() => setShowQrModal(false)}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
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
                className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-colors text-sm font-bold hover:bg-primary/90"
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

export default StoreTab
