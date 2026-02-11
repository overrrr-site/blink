import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import ConfirmDialog from '../../components/ConfirmDialog'

type ExportType = 'owners' | 'dogs' | 'journals'

const EXPORT_ITEMS: { type: ExportType; icon: string; label: string }[] = [
  { type: 'owners', icon: 'solar:users-group-rounded-bold', label: '飼い主データ' },
  { type: 'dogs', icon: 'mdi:dog', label: 'ワンちゃんデータ' },
  { type: 'journals', icon: 'solar:notebook-bold', label: '日誌データ' },
]

function OtherTab() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const isOwner = user?.isOwner || false
  const [exporting, setExporting] = useState<ExportType | null>(null)
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()

  async function handleLogout() {
    const ok = await confirm({
      title: 'ログアウト',
      message: 'ログアウトしますか？',
      confirmLabel: 'ログアウト',
      cancelLabel: 'キャンセル',
      variant: 'default',
    })
    if (!ok) return
    logout()
    navigate('/login')
  }

  async function exportData(type: ExportType) {
    setExporting(type)
    try {
      type CsvRow = Record<string, string | number>
      let data: CsvRow[] = []
      let filename = ''
      let headers: string[] = []

      switch (type) {
        case 'owners': {
          const res = await api.get<Array<Record<string, unknown>>>('/owners')
          data = res.data.map((o) => ({
            ID: Number(o.id),
            氏名: String(o.name || ''),
            電話番号: String(o.phone || ''),
            メール: String(o.email || ''),
            住所: String(o.address || ''),
            登録日: String(o.created_at || '').split('T')[0] || '',
          }))
          headers = ['ID', '氏名', '電話番号', 'メール', '住所', '登録日']
          filename = '飼い主一覧'
          break
        }
        case 'dogs': {
          const res = await api.get<Array<Record<string, unknown>>>('/dogs')
          const genderLabel = (gender: unknown): string => {
            if (gender === 'male') return 'オス'
            if (gender === 'female') return 'メス'
            return ''
          }
          data = res.data.map((d) => ({
            ID: Number(d.id),
            犬名: String(d.name || ''),
            犬種: String(d.breed || ''),
            生年月日: String(d.birthday || ''),
            性別: genderLabel(d.gender),
            飼い主: String(d.owner_name || ''),
            登録日: String(d.created_at || '').split('T')[0] || '',
          }))
          headers = ['ID', '犬名', '犬種', '生年月日', '性別', '飼い主', '登録日']
          filename = '犬一覧'
          break
        }
        case 'journals': {
          const res = await api.get<Array<Record<string, unknown>>>('/journals')
          data = res.data.map((j) => ({
            ID: Number(j.id),
            日付: String(j.journal_date || ''),
            犬名: String(j.dog_name || ''),
            飼い主: String(j.owner_name || ''),
            担当: String(j.staff_name || ''),
            コメント: String(j.comment || '').replace(/"/g, '""'),
          }))
          headers = ['ID', '日付', '犬名', '飼い主', '担当', 'コメント']
          filename = '日誌一覧'
          break
        }
      }

      // CSVダウンロード
      const csvContent =
        '\uFEFF' +
        [headers, ...data.map((row) => headers.map((h) => row[h]))].map((row) =>
          row.map((cell) => `"${cell ?? ''}"`).join(',')
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
    } catch {
      showToast('エクスポートに失敗しました', 'error')
    } finally {
      setExporting(null)
    }
  }

  return (
    <>
      {/* データエクスポート */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:export-bold" width="16" height="16" className="text-chart-2" />
            データエクスポート
          </h2>
        </div>
        <div className="p-4 space-y-3">
          {EXPORT_ITEMS.map(({ type, icon, label }) => (
            <button
              key={type}
              onClick={() => exportData(type)}
              disabled={exporting !== null}
              className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <Icon icon={icon} width="20" height="20" className="text-muted-foreground" />
                <span className="text-sm font-medium">{label}</span>
              </div>
              {exporting === type ? (
                <span className="text-xs text-muted-foreground">エクスポート中...</span>
              ) : (
                <Icon icon="solar:download-bold" width="20" height="20" className="text-primary" />
              )}
            </button>
          ))}
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            CSV形式でダウンロードできます
          </p>
        </div>
      </section>

      {/* プラン・お支払い（管理者のみ） */}
      {isOwner && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:card-bold" width="16" height="16" className="text-primary" />
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
              className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-xl transition-all active:scale-[0.98]"
            >
              <span className="text-sm font-medium">プラン・お支払い管理</span>
              <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
            </button>
          </div>
        </section>
      )}

      {/* ヘルプ・サポート */}
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <button
          onClick={() => navigate('/help')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-all active:scale-[0.98] border-b border-border"
        >
          <div className="flex items-center gap-3">
            <Icon icon="solar:question-circle-bold" width="20" height="20" className="text-muted-foreground" />
            <span className="text-sm font-medium">ヘルプ・サポート</span>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate('/terms')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-all active:scale-[0.98] border-b border-border"
        >
          <div className="flex items-center gap-3">
            <Icon icon="solar:document-text-bold" width="20" height="20" className="text-muted-foreground" />
            <span className="text-sm font-medium">利用規約</span>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </button>
        <button
          onClick={() => navigate('/privacy')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <Icon icon="solar:shield-check-bold" width="20" height="20" className="text-muted-foreground" />
            <span className="text-sm font-medium">プライバシーポリシー</span>
          </div>
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </button>
      </section>

      {/* ログアウト */}
      <button
        onClick={handleLogout}
        className="w-full bg-card rounded-2xl border border-border shadow-sm flex items-center justify-between p-4 hover:bg-muted/50 transition-all active:scale-[0.98]"
        aria-label="ログアウト"
      >
        <div className="flex items-center gap-3">
          <Icon icon="solar:logout-2-bold" width="20" height="20" className="text-muted-foreground" />
          <span className="text-sm font-medium">ログアウト</span>
        </div>
        <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
      </button>

      {/* バージョン情報 */}
      <p className="text-center text-[10px] text-muted-foreground py-4">
        Blink 管理画面 v1.0.0
      </p>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  )
}

export default OtherTab
