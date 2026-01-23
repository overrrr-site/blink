import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

const JournalDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [journal, setJournal] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    morning_toilet_status: '',
    morning_toilet_location: '',
    afternoon_toilet_status: '',
    afternoon_toilet_location: '',
    comment: '',
  })

  useEffect(() => {
    if (id) {
      fetchJournal()
    }
  }, [id])

  const fetchJournal = async () => {
    try {
      const response = await api.get(`/journals/${id}`)
      setJournal(response.data)
      setFormData({
        morning_toilet_status: response.data.morning_toilet_status || '',
        morning_toilet_location: response.data.morning_toilet_location || '',
        afternoon_toilet_status: response.data.afternoon_toilet_status || '',
        afternoon_toilet_location: response.data.afternoon_toilet_location || '',
        comment: response.data.comment || '',
      })
    } catch (error) {
      console.error('Error fetching journal:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      await api.put(`/journals/${id}`, formData)
      setIsEditing(false)
      fetchJournal()
    } catch (error) {
      console.error('Error updating journal:', error)
      alert('日誌の更新に失敗しました')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!journal) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">日誌が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/journals')}
            className="p-2 -ml-2 text-foreground"
            aria-label="日誌一覧に戻る"
          >
            <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
          </button>
          <h1 className="text-lg font-bold font-heading">日誌詳細</h1>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
          >
            <iconify-icon icon="solar:pen-bold" width="18" height="18"></iconify-icon>
            編集
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium"
            >
              <iconify-icon icon="solar:check-circle-bold" width="18" height="18"></iconify-icon>
              保存
            </button>
          </div>
        )}
      </header>

      <main className="px-5 pt-4 space-y-6">
        {/* 犬情報 */}
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
          <div className="flex items-center gap-4">
            {journal.dog_photo ? (
              <img
                src={journal.dog_photo}
                alt={journal.dog_name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                <iconify-icon
                  icon="solar:paw-print-bold"
                  width="32"
                  height="32"
                  className="text-muted-foreground"
                ></iconify-icon>
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{journal.dog_name}</h2>
              <p className="text-sm text-muted-foreground">{journal.owner_name} 様</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(journal.journal_date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                {journal.visit_count}回目
              </span>
            </div>
          </div>
        </div>

        {/* トイレ記録 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <iconify-icon icon="solar:box-bold" width="20" height="20" className="text-chart-1"></iconify-icon>
            トイレ記録
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">午前 (AM)</h4>
              {isEditing ? (
                <div className="space-y-2">
                  <select
                    value={formData.morning_toilet_status}
                    onChange={(e) => setFormData({ ...formData, morning_toilet_status: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2"
                  >
                    <option value="">未選択</option>
                    <option value="成功">成功</option>
                    <option value="失敗">失敗</option>
                  </select>
                  <select
                    value={formData.morning_toilet_location}
                    onChange={(e) => setFormData({ ...formData, morning_toilet_location: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2"
                  >
                    <option value="">場所を選択</option>
                    <option value="散歩中">散歩中</option>
                    <option value="自ら指定の場所">自ら指定の場所</option>
                    <option value="誘導して指定の場所">誘導して指定の場所</option>
                    <option value="できない">できない</option>
                  </select>
                </div>
              ) : (
                <>
                  <p className={`text-sm font-medium ${journal.morning_toilet_status === '成功' ? 'text-chart-2' : 'text-destructive'}`}>
                    {journal.morning_toilet_status || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{journal.morning_toilet_location || '-'}</p>
                </>
              )}
            </div>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2">午後 (PM)</h4>
              {isEditing ? (
                <div className="space-y-2">
                  <select
                    value={formData.afternoon_toilet_status}
                    onChange={(e) => setFormData({ ...formData, afternoon_toilet_status: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2"
                  >
                    <option value="">未選択</option>
                    <option value="成功">成功</option>
                    <option value="失敗">失敗</option>
                  </select>
                  <select
                    value={formData.afternoon_toilet_location}
                    onChange={(e) => setFormData({ ...formData, afternoon_toilet_location: e.target.value })}
                    className="w-full text-sm bg-input border border-border rounded-lg px-3 py-2"
                  >
                    <option value="">場所を選択</option>
                    <option value="散歩中">散歩中</option>
                    <option value="自ら指定の場所">自ら指定の場所</option>
                    <option value="誘導して指定の場所">誘導して指定の場所</option>
                    <option value="できない">できない</option>
                  </select>
                </div>
              ) : (
                <>
                  <p className={`text-sm font-medium ${journal.afternoon_toilet_status === '成功' ? 'text-chart-2' : 'text-destructive'}`}>
                    {journal.afternoon_toilet_status || '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{journal.afternoon_toilet_location || '-'}</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* コメント */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <iconify-icon icon="solar:pen-new-square-bold" width="20" height="20" className="text-primary"></iconify-icon>
            今日の様子
          </h3>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            {isEditing ? (
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                className="w-full h-32 bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="今日のワンちゃんの様子を記入してください..."
              />
            ) : (
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {journal.comment || '（コメントなし）'}
              </p>
            )}
          </div>
        </section>

        {/* 担当スタッフ */}
        {journal.staff_name && (
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <iconify-icon icon="solar:user-bold" width="20" height="20" className="text-chart-3"></iconify-icon>
              担当スタッフ
            </h3>
            <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
              <p className="text-sm font-medium">{journal.staff_name}</p>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default JournalDetail
