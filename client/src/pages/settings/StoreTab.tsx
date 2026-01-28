import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from '@rc-component/qrcode'
import api from '../../api/client'

interface StoreTabProps {
  storeInfo: any
  setStoreInfo: (info: any) => void
  fetchStoreInfo: () => Promise<void>
}

const StoreTab = ({ storeInfo, setStoreInfo, fetchStoreInfo }: StoreTabProps) => {
  const navigate = useNavigate()
  const [storeSettings, setStoreSettings] = useState({ max_capacity: 15 })
  const [loadingStoreSettings, setLoadingStoreSettings] = useState(true)
  const [staffList, setStaffList] = useState<any[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [trainingMasters, setTrainingMasters] = useState<Record<string, any[]>>({})
  const [loadingTraining, setLoadingTraining] = useState(true)
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false)
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false)
  const [showStaffInviteModal, setShowStaffInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteIsOwner, setInviteIsOwner] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [qrLoading, setQrLoading] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  useEffect(() => {
    fetchStoreSettings()
    fetchStaff()
    fetchTrainingMasters()
    fetchQrCode()
  }, [])

  const fetchStoreSettings = async () => {
    try {
      const response = await api.get('/store-settings')
      setStoreSettings(response.data)
    } catch (error) {
      console.error('Error fetching store settings:', error)
    } finally {
      setLoadingStoreSettings(false)
    }
  }

  const handleStoreSettingsChange = (field: string, value: number) => {
    setStoreSettings((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const fetchStaff = async () => {
    try {
      const response = await api.get('/staff')
      setStaffList(response.data)
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoadingStaff(false)
    }
  }

  const handleDeleteStaff = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このスタッフを削除しますか？')) {
      return
    }

    try {
      await api.delete(`/staff/${id}`)
      fetchStaff()
    } catch (error: any) {
      console.error('Error deleting staff:', error)
      alert(error.response?.data?.error || 'スタッフの削除に失敗しました')
    }
  }

  const handleInviteStaff = async () => {
    if (!inviteEmail || !inviteName) {
      alert('メールアドレスと名前を入力してください')
      return
    }

    setInviting(true)
    try {
      await api.post('/auth/invite', { email: inviteEmail, name: inviteName, is_owner: inviteIsOwner })
      alert(`${inviteEmail} に招待メールを送信しました`)
      setShowStaffInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInviteIsOwner(false)
      fetchStaff()
    } catch (error: any) {
      console.error('Error inviting staff:', error)
      alert(error.response?.data?.error || 'スタッフの招待に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  const fetchTrainingMasters = async () => {
    try {
      const response = await api.get('/training-masters')
      setTrainingMasters(response.data)
    } catch (error) {
      console.error('Error fetching training masters:', error)
    } finally {
      setLoadingTraining(false)
    }
  }

  const handleDeleteTrainingItem = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このトレーニング項目を削除しますか？')) {
      return
    }

    try {
      await api.delete(`/training-masters/${id}`)
      fetchTrainingMasters()
    } catch (error: any) {
      console.error('Error deleting training item:', error)
      alert(error.response?.data?.error || 'トレーニング項目の削除に失敗しました')
    }
  }

  const handleReorderTrainingItem = async (category: string, itemId: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation()

    const items = trainingMasters[category]
    if (!items) return

    const currentIndex = items.findIndex((item: any) => item.id === itemId)
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
      fetchTrainingMasters()
    } catch (error: any) {
      console.error('Error reordering training item:', error)
      alert('トレーニング項目の並び替えに失敗しました')
    }
  }

  const fetchQrCode = async () => {
    setQrLoading(true)
    try {
      const response = await api.get('/liff/qr-code')
      setQrCode(response.data.qrCode)
    } catch (error) {
      console.error('Error fetching QR code:', error)
    } finally {
      setQrLoading(false)
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

  const handleSaveStoreInfo = async (data: any) => {
    try {
      await api.put('/stores', data)
      fetchStoreInfo()
      setShowStoreInfoModal(false)
      alert('店舗情報を保存しました')
    } catch (error: any) {
      console.error('Error saving store info:', error)
      alert(error.response?.data?.error || '店舗情報の保存に失敗しました')
    }
  }

  const handleSaveBusinessHours = async (businessHours: any, closedDays: string[]) => {
    try {
      await api.put('/stores', {
        business_hours: businessHours,
        closed_days: closedDays,
      })
      fetchStoreInfo()
      setShowBusinessHoursModal(false)
      alert('営業日・定休日を保存しました')
    } catch (error: any) {
      console.error('Error saving business hours:', error)
      alert(error.response?.data?.error || '営業日・定休日の保存に失敗しました')
    }
  }

  return (
    <>
      {/* 店舗情報 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <iconify-icon icon="solar:shop-bold" width="16" height="16" class="text-primary"></iconify-icon>
            店舗情報
          </h2>
        </div>
        <button
          onClick={() => setShowStoreInfoModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:buildings-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <div className="text-left">
              <span className="text-sm font-medium block">基本情報</span>
              <span className="text-[10px] text-muted-foreground">店舗名、住所、電話番号</span>
            </div>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
        <button
          onClick={() => setShowBusinessHoursModal(true)}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:calendar-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <div className="text-left">
              <span className="text-sm font-medium block">営業日・定休日</span>
              <span className="text-[10px] text-muted-foreground">営業カレンダーの設定</span>
            </div>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
        <div className="w-full flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:users-group-rounded-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <div className="text-left flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium block">受入可能頭数</span>
                <div className="relative group">
                  <iconify-icon
                    icon="solar:question-circle-bold"
                    width="14" height="14" class="text-muted-foreground cursor-help"
                  ></iconify-icon>
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
      </section>

      {/* 登園用QRコード */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <iconify-icon icon="solar:qr-code-bold" width="16" height="16" class="text-primary"></iconify-icon>
            登園用QRコード
          </h2>
        </div>
        <div className="p-4">
          {qrLoading ? (
            <div className="flex items-center justify-center py-8">
              <iconify-icon icon="solar:spinner-bold" width="24" height="24" class="text-primary animate-spin"></iconify-icon>
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
                <iconify-icon icon="solar:printer-bold" width="16" height="16"></iconify-icon>
                QRコードを印刷
              </button>
              <button
                onClick={() => setShowQrModal(true)}
                className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium"
              >
                <iconify-icon icon="solar:eye-bold" width="16" height="16"></iconify-icon>
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
                disabled={qrLoading}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                再試行
              </button>
            </div>
          )}
        </div>
      </section>

      {/* スタッフ管理 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <iconify-icon icon="solar:user-id-bold" width="16" height="16" class="text-chart-3"></iconify-icon>
            スタッフ管理
          </h2>
          <button
            onClick={() => setShowStaffInviteModal(true)}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <iconify-icon icon="solar:add-circle-bold" width="14" height="14"></iconify-icon>
            追加
          </button>
        </div>
        {loadingStaff ? (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        ) : staffList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <iconify-icon icon="solar:user-id-bold" width="48" height="48" class="mx-auto mb-2 opacity-50"></iconify-icon>
            <p className="text-sm">スタッフが登録されていません</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {staffList.map((staff) => (
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
                  <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
                </button>
                <button
                  onClick={(e) => handleDeleteStaff(staff.id, e)}
                  className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                  aria-label={`${staff.name}を削除`}
                >
                  <iconify-icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16"></iconify-icon>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* トレーニング項目 */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <iconify-icon icon="solar:checklist-bold" width="16" height="16" class="text-chart-2"></iconify-icon>
            トレーニング項目
          </h2>
          <button
            onClick={() => navigate('/settings/training/new')}
            className="text-xs font-bold text-primary flex items-center gap-1"
          >
            <iconify-icon icon="solar:add-circle-bold" width="14" height="14"></iconify-icon>
            追加
          </button>
        </div>
        {loadingTraining ? (
          <div className="text-center py-4">
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        ) : Object.keys(trainingMasters).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <iconify-icon icon="solar:checklist-bold" width="48" height="48" class="mx-auto mb-2 opacity-50"></iconify-icon>
            <p className="text-sm">トレーニング項目が登録されていません</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {Object.entries(trainingMasters).map(([category, items]) => (
              <div key={category} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold">{category}</h3>
                  <span className="text-[10px] text-muted-foreground">{items.length}項目</span>
                </div>
                <div className="space-y-1">
                  {items.map((item: any, index: number) => (
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
                          <iconify-icon icon="solar:alt-arrow-up-linear" width="14" height="14"></iconify-icon>
                        </button>
                        <button
                          onClick={(e) => handleReorderTrainingItem(category, item.id, 'down', e)}
                          disabled={index === items.length - 1}
                          className="p-1.5 text-muted-foreground rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          aria-label={`${item.item_label}を下に移動`}
                        >
                          <iconify-icon icon="solar:alt-arrow-down-linear" width="14" height="14"></iconify-icon>
                        </button>
                        <button
                          onClick={() => navigate(`/settings/training/${item.id}`)}
                          className="p-1.5 text-muted-foreground rounded hover:bg-muted transition-colors"
                          aria-label={`${item.item_label}を編集`}
                        >
                          <iconify-icon icon="solar:pen-bold" width="14" height="14"></iconify-icon>
                        </button>
                        <button
                          onClick={(e) => handleDeleteTrainingItem(item.id, e)}
                          className="p-1.5 text-destructive rounded hover:bg-destructive/10 transition-colors"
                          aria-label={`${item.item_label}を削除`}
                        >
                          <iconify-icon icon="solar:trash-bin-minimalistic-bold" width="14" height="14"></iconify-icon>
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
                <iconify-icon icon="solar:close-bold" width="24" height="24"></iconify-icon>
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
                <iconify-icon icon="solar:close-bold" width="24" height="24"></iconify-icon>
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
                          setStoreInfo((prev: any) => ({ ...prev, closed_days: newClosed }))
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
                }}
                className="size-12 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
                aria-label="閉じる"
              >
                <iconify-icon icon="solar:close-bold" width="24" height="24"></iconify-icon>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-accent/30 rounded-xl p-3 flex items-start gap-2">
                <iconify-icon icon="solar:info-circle-bold" width="16" height="16" class="text-accent-foreground mt-0.5"></iconify-icon>
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
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStaffInviteModal(false)
                    setInviteEmail('')
                    setInviteName('')
                    setInviteIsOwner(false)
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
                <iconify-icon icon="solar:close-bold" width="24" height="24"></iconify-icon>
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
                <iconify-icon icon="solar:printer-bold" width="16" height="16"></iconify-icon>
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
