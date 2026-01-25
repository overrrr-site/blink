import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
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

const Settings = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { logout } = useAuthStore()
  const [exporting, setExporting] = useState<string | null>(null)
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState<{
    connected: boolean
    calendarId: string | null
    enabled: boolean
  } | null>(null)
  const [loadingCalendar, setLoadingCalendar] = useState(true)
  const [storeSettings, setStoreSettings] = useState({ max_capacity: 15 })
  const [loadingStoreSettings, setLoadingStoreSettings] = useState(true)
  const [savingStoreSettings, setSavingStoreSettings] = useState(false)
  const [staffList, setStaffList] = useState<any[]>([])
  const [loadingStaff, setLoadingStaff] = useState(true)
  const [courseList, setCourseList] = useState<any[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [trainingMasters, setTrainingMasters] = useState<Record<string, any[]>>({})
  const [loadingTraining, setLoadingTraining] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('store')
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [loadingStoreInfo, setLoadingStoreInfo] = useState(true)
  const [showStoreInfoModal, setShowStoreInfoModal] = useState(false)
  const [showBusinessHoursModal, setShowBusinessHoursModal] = useState(false)
  const [showStaffInviteModal, setShowStaffInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviting, setInviting] = useState(false)
  const [notificationSettings, setNotificationSettings] = useState({
    reminder_before_visit: true,
    journal_notification: true,
    vaccine_alert: true,
  })
  const [lineStatus, setLineStatus] = useState<{
    connected: boolean
    channelId: string | null
  } | null>(null)
  const [loadingLine, setLoadingLine] = useState(true)
  const [showLineModal, setShowLineModal] = useState(false)
  const [lineSettings, setLineSettings] = useState({
    channelId: '',
    channelSecret: '',
    channelAccessToken: '',
  })
  const [savingLine, setSavingLine] = useState(false)

  useEffect(() => {
    fetchGoogleCalendarStatus()
    fetchStoreSettings()
    fetchStaff()
    fetchCourses()
    fetchTrainingMasters()
    fetchStoreInfo()
    fetchNotificationSettings()
    fetchLineStatus()
    
    // URLパラメータで連携成功/失敗を確認
    const status = searchParams.get('google_calendar')
    if (status === 'connected') {
      // 連携成功時は状態を再取得
      setTimeout(() => {
        fetchGoogleCalendarStatus()
        navigate('/settings', { replace: true })
      }, 1000)
    }
  }, [])

  const fetchGoogleCalendarStatus = async () => {
    try {
      const response = await api.get('/google-calendar/status')
      setGoogleCalendarStatus(response.data)
    } catch (error) {
      console.error('Error fetching Google Calendar status:', error)
    } finally {
      setLoadingCalendar(false)
    }
  }

  const fetchNotificationSettings = async () => {
    try {
      const response = await api.get('/notifications/settings')
      setNotificationSettings({
        reminder_before_visit: response.data.reminder_before_visit ?? true,
        journal_notification: response.data.journal_notification ?? true,
        vaccine_alert: response.data.vaccine_alert ?? true,
      })
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    }
  }

  const saveNotificationSettings = async () => {
    try {
      await api.put('/notifications/settings', notificationSettings)
      alert('通知設定を保存しました')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      alert('通知設定の保存に失敗しました')
    }
  }

  const handleGoogleCalendarConnect = async () => {
    try {
      const response = await api.get('/google-calendar/auth')
      window.location.href = response.data.authUrl
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      alert('Googleカレンダー連携の開始に失敗しました')
    }
  }

  const handleGoogleCalendarDisconnect = async () => {
    if (!confirm('Googleカレンダー連携を解除しますか？')) {
      return
    }

    try {
      await api.post('/google-calendar/disconnect')
      setGoogleCalendarStatus({ connected: false, calendarId: null, enabled: false })
      alert('Googleカレンダー連携を解除しました')
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      alert('連携の解除に失敗しました')
    }
  }

  // 店舗設定保存
  const handleSaveStoreSettings = async () => {
    setSavingStoreSettings(true)
    try {
      await api.put('/store-settings', storeSettings)
      alert('店舗設定を保存しました')
    } catch (error) {
      console.error('Error saving store settings:', error)
      alert('店舗設定の保存に失敗しました')
    } finally {
      setSavingStoreSettings(false)
    }
  }

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
      await api.post('/auth/invite', { email: inviteEmail, name: inviteName })
      alert(`${inviteEmail} に招待メールを送信しました`)
      setShowStaffInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      fetchStaff()
    } catch (error: any) {
      console.error('Error inviting staff:', error)
      alert(error.response?.data?.error || 'スタッフの招待に失敗しました')
    } finally {
      setInviting(false)
    }
  }

  const fetchCourses = async () => {
    try {
      const response = await api.get('/course-masters')
      setCourseList(response.data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoadingCourses(false)
    }
  }

  const handleDeleteCourse = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('このコースを削除しますか？')) {
      return
    }

    try {
      await api.delete(`/course-masters/${id}`)
      fetchCourses()
    } catch (error: any) {
      console.error('Error deleting course:', error)
      alert(error.response?.data?.error || 'コースの削除に失敗しました')
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

  const fetchStoreInfo = async () => {
    try {
      const response = await api.get('/stores')
      setStoreInfo(response.data)
    } catch (error) {
      console.error('Error fetching store info:', error)
    } finally {
      setLoadingStoreInfo(false)
    }
  }

  const fetchLineStatus = async () => {
    try {
      const response = await api.get('/stores')
      setLineStatus({
        connected: response.data.line_connected || false,
        channelId: response.data.line_channel_id || null,
      })
    } catch (error) {
      console.error('Error fetching LINE status:', error)
    } finally {
      setLoadingLine(false)
    }
  }

  const handleLineConnect = () => {
    setLineSettings({
      channelId: '',
      channelSecret: '',
      channelAccessToken: '',
    })
    setShowLineModal(true)
  }

  const handleLineSave = async () => {
    if (!lineSettings.channelId || !lineSettings.channelSecret || !lineSettings.channelAccessToken) {
      alert('すべての項目を入力してください')
      return
    }

    setSavingLine(true)
    try {
      await api.put('/stores', {
        line_channel_id: lineSettings.channelId,
        line_channel_secret: lineSettings.channelSecret,
        line_channel_access_token: lineSettings.channelAccessToken,
      })
      setShowLineModal(false)
      fetchLineStatus()
      alert('LINE公式アカウント連携を設定しました')
    } catch (error) {
      console.error('Error saving LINE settings:', error)
      alert('LINE連携の設定に失敗しました')
    } finally {
      setSavingLine(false)
    }
  }

  const handleLineDisconnect = async () => {
    if (!confirm('LINE公式アカウント連携を解除しますか？')) {
      return
    }

    try {
      await api.put('/stores', {
        line_channel_id: null,
        line_channel_secret: null,
        line_channel_access_token: null,
      })
      fetchLineStatus()
      alert('LINE公式アカウント連携を解除しました')
    } catch (error) {
      console.error('Error disconnecting LINE:', error)
      alert('連携の解除に失敗しました')
    }
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

  const handleLogout = () => {
    if (!confirm('ログアウトしますか？')) {
      return
    }
    logout()
    navigate('/login')
  }

  // データエクスポート機能
  const exportData = async (type: 'owners' | 'dogs' | 'journals') => {
    setExporting(type)
    try {
      let data: any[] = []
      let filename = ''
      let headers: string[] = []

      if (type === 'owners') {
        const res = await api.get('/owners')
        data = res.data.map((o: any) => ({
          ID: o.id,
          氏名: o.name,
          電話番号: o.phone || '',
          メール: o.email || '',
          住所: o.address || '',
          登録日: o.created_at?.split('T')[0] || '',
        }))
          headers = ['ID', '氏名', '電話番号', 'メール', '住所', '登録日']
          filename = '飼い主一覧'
      }

      if (type === 'dogs') {
        const res = await api.get('/dogs')
        data = res.data.map((d: any) => ({
          ID: d.id,
          犬名: d.name,
          犬種: d.breed || '',
          生年月日: d.birthday || '',
          性別: d.gender === 'male' ? 'オス' : d.gender === 'female' ? 'メス' : '',
          飼い主: d.owner_name || '',
          登録日: d.created_at?.split('T')[0] || '',
        }))
          headers = ['ID', '犬名', '犬種', '生年月日', '性別', '飼い主', '登録日']
          filename = '犬一覧'
      }

      if (type === 'journals') {
        const res = await api.get('/journals')
        data = res.data.map((j: any) => ({
          ID: j.id,
          日付: j.journal_date,
          犬名: j.dog_name,
          飼い主: j.owner_name,
          担当: j.staff_name || '',
          コメント: j.comment?.replace(/"/g, '""') || '',
        }))
          headers = ['ID', '日付', '犬名', '飼い主', '担当', 'コメント']
          filename = '日誌一覧'
      }

      // CSVダウンロード
      const csvContent =
        '\uFEFF' +
        [headers, ...data.map((row) => headers.map((h) => row[h]))].map((row) =>
          row.map((cell) => `"${cell || ''}"`).join(',')
        ).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export error:', error)
      alert('エクスポートに失敗しました')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="pb-6">
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
        {/* 店舗設定タブ */}
        {activeTab === 'store' && (
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

        {/* スタッフ管理 */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <iconify-icon icon="solar:user-id-bold" width="16" height="16" class="text-chart-3"></iconify-icon>
              スタッフ管理
            </h2>
            <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowStaffInviteModal(true)}
                  className="text-xs font-bold text-chart-2 flex items-center gap-1"
                >
              <iconify-icon icon="solar:letter-bold" width="14" height="14"></iconify-icon>
              招待
            </button>
                <button
                  onClick={() => navigate('/settings/staff/new')}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
              <iconify-icon icon="solar:add-circle-bold" width="14" height="14"></iconify-icon>
              追加
            </button>
            </div>
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
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg group"
                          >
                            <span className="text-xs text-muted-foreground">{item.item_label}</span>
                            <button
                              onClick={(e) => handleDeleteTrainingItem(item.id, e)}
                              className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-colors opacity-60 hover:opacity-100"
                              aria-label={`${item.item_label}を削除`}
                            >
                              <iconify-icon icon="solar:trash-bin-minimalistic-bold" width="14" height="14"></iconify-icon>
            </button>
          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
        </section>
          </>
        )}

        {/* 契約タブ */}
        {activeTab === 'pricing' && (
          <>
        {/* コース・料金設定 */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <iconify-icon icon="solar:tag-price-bold" width="16" height="16" class="text-chart-4"></iconify-icon>
              コース・料金設定
            </h2>
                <button
                  onClick={() => navigate('/settings/courses/new')}
                  className="text-xs font-bold text-primary flex items-center gap-1"
                >
              <iconify-icon icon="solar:add-circle-bold" width="14" height="14"></iconify-icon>
              追加
            </button>
          </div>
              {loadingCourses ? (
                <div className="text-center py-4">
                  <span className="text-xs text-muted-foreground">読み込み中...</span>
                </div>
              ) : courseList.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <iconify-icon icon="solar:tag-price-bold" width="48" height="48" class="mx-auto mb-2 opacity-50"></iconify-icon>
                  <p className="text-sm">コースが登録されていません</p>
                </div>
              ) : (
          <div className="divide-y divide-border">
                  {courseList.map((course) => (
                    <div
                      key={course.id}
                      className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                    >
                      <div
                        className="flex-1 text-left cursor-pointer"
                        onClick={() => navigate(`/settings/courses/${course.id}`)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium block">{course.course_name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            course.contract_type === '月謝制' ? 'bg-chart-2/10 text-chart-2' :
                            course.contract_type === 'チケット制' ? 'bg-chart-4/10 text-chart-4' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {course.contract_type}
                          </span>
                          {!course.enabled && (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                              無効
                            </span>
                          )}
              </div>
                        <span className="text-[10px] text-muted-foreground">
                          {course.sessions && `${course.sessions}回 / `}
                          ¥{course.price?.toLocaleString()}
                          {course.valid_days && ` / 有効期限${course.valid_days}日`}
                        </span>
              </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigate(`/settings/courses/${course.id}`)}
                          className="p-2 rounded-full hover:bg-muted transition-colors"
                          aria-label={`${course.course_name}の詳細`}
                        >
              <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            </button>
                        <button
                          onClick={(e) => handleDeleteCourse(course.id, e)}
                          className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-colors"
                          aria-label={`${course.course_name}を削除`}
                        >
                          <iconify-icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16"></iconify-icon>
            </button>
              </div>
          </div>
                  ))}
                </div>
              )}
        </section>
          </>
        )}

        {/* 連携タブ */}
        {activeTab === 'integration' && (
          <>
            {/* Googleカレンダー連携 */}
            <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-bold font-heading flex items-center gap-2">
                  <iconify-icon icon="solar:calendar-bold" width="16" height="16" class="text-primary"></iconify-icon>
                  Googleカレンダー連携
                </h2>
              </div>
              <div className="p-4">
                {loadingCalendar ? (
                  <div className="text-center py-4">
                    <span className="text-xs text-muted-foreground">読み込み中...</span>
                  </div>
                ) : googleCalendarStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="bg-chart-2/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-chart-2">連携中</span>
                        <span className="text-xs bg-chart-2/20 text-chart-2 px-2 py-0.5 rounded-full font-bold">
                          有効
                        </span>
                      </div>
                      <p className="text-sm font-medium">Googleカレンダーと連携中</p>
                      {googleCalendarStatus.calendarId && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          カレンダーID: {googleCalendarStatus.calendarId.substring(0, 20)}...
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleGoogleCalendarDisconnect}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium text-destructive"
                    >
                      <iconify-icon icon="solar:unlink-bold" width="16" height="16"></iconify-icon>
                      連携を解除
          </button>
            </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-sm font-medium mb-1">未連携</p>
                      <p className="text-[10px] text-muted-foreground">
                        予約をGoogleカレンダーに自動同期できます
                      </p>
                    </div>
                    <button
                      onClick={handleGoogleCalendarConnect}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-colors text-sm font-bold hover:bg-primary/90"
                    >
                      <iconify-icon icon="solar:calendar-bold" width="16" height="16"></iconify-icon>
                      Googleカレンダーと連携
          </button>
                  </div>
                )}
              </div>
        </section>

            {/* LINE公式アカウント連携 */}
            <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h2 className="text-sm font-bold font-heading flex items-center gap-2">
                  <iconify-icon icon="solar:chat-round-bold" width="16" height="16" class="text-primary"></iconify-icon>
                  LINE公式アカウント連携
                </h2>
              </div>
              <div className="p-4">
                {loadingLine ? (
                  <div className="text-center py-4">
                    <span className="text-xs text-muted-foreground">読み込み中...</span>
                  </div>
                ) : lineStatus?.connected ? (
                  <div className="space-y-3">
                    <div className="bg-chart-2/10 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-chart-2">連携中</span>
                        <span className="text-xs bg-chart-2/20 text-chart-2 px-2 py-0.5 rounded-full font-bold">
                          有効
                        </span>
                      </div>
                      <p className="text-sm font-medium">LINE公式アカウントと連携中</p>
                      {lineStatus.channelId && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          チャネルID: {lineStatus.channelId}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={handleLineConnect}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium"
                    >
                      <iconify-icon icon="solar:settings-bold" width="16" height="16"></iconify-icon>
                      設定を変更
                    </button>
                    <button
                      onClick={handleLineDisconnect}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-sm font-medium text-destructive"
                    >
                      <iconify-icon icon="solar:unlink-bold" width="16" height="16"></iconify-icon>
                      連携を解除
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-sm font-medium mb-1">未連携</p>
                      <p className="text-[10px] text-muted-foreground">
                        LINE Messaging APIを使用してメッセージを送信できます
                      </p>
                    </div>
                    <button
                      onClick={handleLineConnect}
                      className="w-full flex items-center justify-center gap-2 p-3 bg-primary text-primary-foreground rounded-xl transition-colors text-sm font-bold hover:bg-primary/90"
                    >
                      <iconify-icon icon="solar:chat-round-bold" width="16" height="16"></iconify-icon>
                      LINE公式アカウントと連携
                    </button>
                  </div>
                )}
              </div>
        </section>

        {/* 通知設定 */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <iconify-icon icon="solar:bell-bold" width="16" height="16" class="text-chart-5"></iconify-icon>
              通知設定
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium block">登園前リマインド</span>
                <span className="text-[10px] text-muted-foreground">前日18:00に飼い主へ通知</span>
              </div>
              <button
                onClick={async () => {
                  const newValue = !notificationSettings.reminder_before_visit
                  setNotificationSettings(prev => ({ ...prev, reminder_before_visit: newValue }))
                  await api.put('/notifications/settings', { ...notificationSettings, reminder_before_visit: newValue })
                }}
                className={`w-14 h-8 rounded-full relative transition-colors min-w-[56px] ${
                  notificationSettings.reminder_before_visit ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={notificationSettings.reminder_before_visit}
              >
                <span className={`absolute top-1 size-6 bg-white rounded-full shadow transition-all ${
                  notificationSettings.reminder_before_visit ? 'right-1' : 'left-1'
                }`}></span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium block">日誌送信通知</span>
                <span className="text-[10px] text-muted-foreground">日誌作成時に飼い主へ通知</span>
              </div>
              <button
                onClick={async () => {
                  const newValue = !notificationSettings.journal_notification
                  setNotificationSettings(prev => ({ ...prev, journal_notification: newValue }))
                  await api.put('/notifications/settings', { ...notificationSettings, journal_notification: newValue })
                }}
                className={`w-14 h-8 rounded-full relative transition-colors min-w-[56px] ${
                  notificationSettings.journal_notification ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={notificationSettings.journal_notification}
              >
                <span className={`absolute top-1 size-6 bg-white rounded-full shadow transition-all ${
                  notificationSettings.journal_notification ? 'right-1' : 'left-1'
                }`}></span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium block">ワクチン期限アラート</span>
                <span className="text-[10px] text-muted-foreground">期限30日前・14日前に通知</span>
              </div>
              <button
                onClick={async () => {
                  const newValue = !notificationSettings.vaccine_alert
                  setNotificationSettings(prev => ({ ...prev, vaccine_alert: newValue }))
                  await api.put('/notifications/settings', { ...notificationSettings, vaccine_alert: newValue })
                }}
                className={`w-14 h-8 rounded-full relative transition-colors min-w-[56px] ${
                  notificationSettings.vaccine_alert ? 'bg-primary' : 'bg-muted'
                }`}
                role="switch"
                aria-checked={notificationSettings.vaccine_alert}
              >
                <span className={`absolute top-1 size-6 bg-white rounded-full shadow transition-all ${
                  notificationSettings.vaccine_alert ? 'right-1' : 'left-1'
                }`}></span>
              </button>
            </div>
          </div>
        </section>
          </>
        )}

        {/* その他タブ */}
        {activeTab === 'other' && (
          <>
        {/* データエクスポート */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <iconify-icon icon="solar:export-bold" width="16" height="16" class="text-chart-2"></iconify-icon>
              データエクスポート
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <button
              onClick={() => exportData('owners')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <iconify-icon icon="solar:users-group-rounded-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
                <span className="text-sm font-medium">飼い主データ</span>
              </div>
              {exporting === 'owners' ? (
                <span className="text-xs text-muted-foreground">エクスポート中...</span>
              ) : (
                <iconify-icon icon="solar:download-bold" width="20" height="20" class="text-primary"></iconify-icon>
              )}
            </button>
            <button
              onClick={() => exportData('dogs')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <iconify-icon icon="mdi:dog" width="20" height="20" class="text-muted-foreground"></iconify-icon>
                <span className="text-sm font-medium">犬データ</span>
              </div>
              {exporting === 'dogs' ? (
                <span className="text-xs text-muted-foreground">エクスポート中...</span>
              ) : (
                <iconify-icon icon="solar:download-bold" width="20" height="20" class="text-primary"></iconify-icon>
              )}
            </button>
            <button
              onClick={() => exportData('journals')}
              disabled={exporting !== null}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <iconify-icon icon="solar:notebook-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
                <span className="text-sm font-medium">日誌データ</span>
              </div>
              {exporting === 'journals' ? (
                <span className="text-xs text-muted-foreground">エクスポート中...</span>
              ) : (
                <iconify-icon icon="solar:download-bold" width="20" height="20" class="text-primary"></iconify-icon>
              )}
            </button>
            <p className="text-[10px] text-muted-foreground text-center pt-2">
                  CSV形式でダウンロードできます
            </p>
          </div>
        </section>

        {/* プラン・お支払い */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <iconify-icon icon="solar:card-bold" width="16" height="16" class="text-primary"></iconify-icon>
              プラン・お支払い
            </h2>
          </div>
          <div className="p-4">
            <div className="bg-accent/30 rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-accent-foreground">現在のプラン</span>
                <span className="text-xs bg-chart-2/10 text-chart-2 px-2 py-0.5 rounded-full font-bold">アクティブ</span>
              </div>
              <p className="text-lg font-bold">スタンダードプラン</p>
              <p className="text-xs text-muted-foreground">¥5,500/月（税込）</p>
            </div>
            <button
              onClick={() => navigate('/billing')}
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-xl transition-colors"
            >
              <span className="text-sm font-medium">プラン・お支払い管理</span>
              <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            </button>
          </div>
        </section>

            {/* ヘルプ・サポート */}
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <button
                onClick={() => navigate('/help')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
              >
            <div className="flex items-center gap-3">
              <iconify-icon icon="solar:question-circle-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
              <span className="text-sm font-medium">ヘルプ・サポート</span>
            </div>
            <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
          </button>
              <button
                onClick={() => alert('利用規約は準備中です。')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
              >
            <div className="flex items-center gap-3">
              <iconify-icon icon="solar:document-text-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
              <span className="text-sm font-medium">利用規約</span>
            </div>
            <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
          </button>
              <button
                onClick={() => alert('プライバシーポリシーは準備中です。')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
            <div className="flex items-center gap-3">
              <iconify-icon icon="solar:shield-check-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
              <span className="text-sm font-medium">プライバシーポリシー</span>
            </div>
            <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
          </button>
            </section>

            {/* ログアウト */}
            <button
              onClick={handleLogout}
              className="w-full bg-card rounded-2xl border border-border shadow-sm flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              aria-label="ログアウト"
            >
              <div className="flex items-center gap-3">
                <iconify-icon icon="solar:logout-2-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
                <span className="text-sm font-medium">ログアウト</span>
              </div>
              <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            </button>

        {/* バージョン情報 */}
        <p className="text-center text-[10px] text-muted-foreground py-4">
          Blink 管理画面 v1.0.0
        </p>
          </>
        )}
      </main>

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
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowStaffInviteModal(false)
                    setInviteEmail('')
                    setInviteName('')
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

      {/* LINE公式アカウント連携設定モーダル */}
      {showLineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-2xl w-full max-w-md">
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">LINE公式アカウント連携</h2>
              <button
                onClick={() => {
                  setShowLineModal(false)
                  setLineSettings({
                    channelId: '',
                    channelSecret: '',
                    channelAccessToken: '',
                  })
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
                  LINE Developersコンソールで取得した、Messaging APIのチャネル情報を入力してください。
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">チャネルID</label>
                <input
                  type="text"
                  value={lineSettings.channelId}
                  onChange={(e) => setLineSettings({ ...lineSettings, channelId: e.target.value })}
                  placeholder="1234567890"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  確認場所: LINE Developers コンソール → チャネル基本設定
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">チャネルシークレット</label>
                <input
                  type="text"
                  value={lineSettings.channelSecret}
                  onChange={(e) => setLineSettings({ ...lineSettings, channelSecret: e.target.value })}
                  placeholder="abcdefghijklmnopqrstuvwxyz"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  確認場所: LINE Official Account Manager → 設定 → Messaging API
                </p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">チャネルアクセストークン</label>
                <textarea
                  value={lineSettings.channelAccessToken}
                  onChange={(e) => setLineSettings({ ...lineSettings, channelAccessToken: e.target.value })}
                  placeholder="Bearer xxxxx..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  確認場所: LINE Developers コンソール → Messaging API設定 → 一番下の「発行」ボタン
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowLineModal(false)
                    setLineSettings({
                      channelId: '',
                      channelSecret: '',
                      channelAccessToken: '',
                    })
                  }}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleLineSave}
                  disabled={savingLine || !lineSettings.channelId || !lineSettings.channelSecret || !lineSettings.channelAccessToken}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {savingLine ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
