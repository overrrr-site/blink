import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../api/client'

function OtherTab() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const [exporting, setExporting] = useState<string | null>(null)

  function handleLogout() {
    if (!confirm('ログアウトしますか？')) {
      return
    }
    logout()
    navigate('/login')
  }

  async function exportData(type: 'owners' | 'dogs' | 'journals') {
    setExporting(type)
    try {
      let data: any[] = []
      let filename = ''
      let headers: string[] = []

      switch (type) {
        case 'owners': {
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
          break
        }
        case 'dogs': {
          const res = await api.get('/dogs')
          const genderLabel = (gender: string) => {
            if (gender === 'male') return 'オス'
            if (gender === 'female') return 'メス'
            return ''
          }
          data = res.data.map((d: any) => ({
            ID: d.id,
            犬名: d.name,
            犬種: d.breed || '',
            生年月日: d.birthday || '',
            性別: genderLabel(d.gender),
            飼い主: d.owner_name || '',
            登録日: d.created_at?.split('T')[0] || '',
          }))
          headers = ['ID', '犬名', '犬種', '生年月日', '性別', '飼い主', '登録日']
          filename = '犬一覧'
          break
        }
        case 'journals': {
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
          break
        }
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
          onClick={() => navigate('/terms')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b border-border"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:document-text-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <span className="text-sm font-medium">利用規約</span>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
        <button
          onClick={() => navigate('/privacy')}
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
  )
}

export default OtherTab
