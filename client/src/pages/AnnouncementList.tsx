import { useState, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import api from '../api/client'
import { fetcher } from '../lib/swr'

interface Announcement {
  id: number
  title: string
  content: string
  image_url: string | null
  is_important: boolean
  published_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  created_by: number | null
  creator_name: string | null
}

type StatusFilter = 'all' | 'published' | 'draft' | 'expired'

const AnnouncementList = () => {
  const { data, isLoading, mutate } = useSWR<Announcement[]>(
    '/announcements',
    fetcher,
    { revalidateOnFocus: false }
  )
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  // フォーム状態
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    image_url: '',
    is_important: false,
    published_at: '',
    expires_at: '',
  })

  const announcements = data ?? []

  const getStatus = (announcement: Announcement): 'published' | 'draft' | 'expired' => {
    const now = new Date()
    if (!announcement.published_at) {
      return 'draft'
    }
    const publishedAt = new Date(announcement.published_at)
    if (publishedAt > now) {
      return 'draft'
    }
    if (announcement.expires_at) {
      const expiresAt = new Date(announcement.expires_at)
      if (expiresAt < now) {
        return 'expired'
      }
    }
    return 'published'
  }

  const getStatusLabel = (status: 'published' | 'draft' | 'expired'): string => {
    switch (status) {
      case 'published': return '公開中'
      case 'draft': return '下書き'
      case 'expired': return '終了'
    }
  }

  const getStatusColor = (status: 'published' | 'draft' | 'expired'): string => {
    switch (status) {
      case 'published': return 'bg-chart-2/10 text-chart-2 border-chart-2/30'
      case 'draft': return 'bg-chart-4/10 text-chart-4 border-chart-4/30'
      case 'expired': return 'bg-muted text-muted-foreground border-border'
    }
  }

  const filteredAnnouncements = announcements.filter((a) => {
    if (statusFilter === 'all') return true
    return getStatus(a) === statusFilter
  })

  const statusCounts = {
    published: announcements.filter((a) => getStatus(a) === 'published').length,
    draft: announcements.filter((a) => getStatus(a) === 'draft').length,
    expired: announcements.filter((a) => getStatus(a) === 'expired').length,
  }

  // UTC ISO文字列をdatetime-local用のローカル時間文字列に変換
  const toLocalDatetime = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 16)
  }

  const openModal = (announcement?: Announcement) => {
    if (announcement) {
      setEditingAnnouncement(announcement)
      setFormData({
        title: announcement.title,
        content: announcement.content,
        image_url: announcement.image_url || '',
        is_important: announcement.is_important,
        published_at: toLocalDatetime(announcement.published_at),
        expires_at: toLocalDatetime(announcement.expires_at),
      })
    } else {
      setEditingAnnouncement(null)
      setFormData({
        title: '',
        content: '',
        image_url: '',
        is_important: false,
        published_at: '',
        expires_at: '',
      })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingAnnouncement(null)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formDataUpload = new FormData()
    formDataUpload.append('file', file)

    setUploading(true)
    try {
      const response = await api.post('/uploads', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFormData((prev) => ({ ...prev, image_url: response.data.url }))
    } catch {
      alert('画像のアップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.content) {
      alert('タイトルと本文は必須です')
      return
    }

    setSaving(true)
    try {
      // datetime-local の値はローカル時間文字列（例: "2026-01-30T14:34"）
      // そのまま送るとサーバー側でUTCとして解釈されるため、ISO 8601形式に変換
      const toISO = (v: string) => v ? new Date(v).toISOString() : null
      const payload = {
        title: formData.title,
        content: formData.content,
        image_url: formData.image_url || null,
        is_important: formData.is_important,
        published_at: toISO(formData.published_at),
        expires_at: toISO(formData.expires_at),
      }

      if (editingAnnouncement) {
        await api.put(`/announcements/${editingAnnouncement.id}`, payload)
      } else {
        await api.post('/announcements', payload)
      }

      await mutate()
      closeModal()
    } catch {
      alert('お知らせの保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editingAnnouncement) return
    if (!confirm('このお知らせを削除しますか？')) return

    setDeleting(true)
    try {
      await api.delete(`/announcements/${editingAnnouncement.id}`)
      await mutate()
      closeModal()
    } catch {
      alert('お知らせの削除に失敗しました')
    } finally {
      setDeleting(false)
    }
  }

  const publishNow = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    setFormData((prev) => ({
      ...prev,
      published_at: now.toISOString().slice(0, 16),
    }))
  }

  if (isLoading) {
    return (
      <div className="pb-6">
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-40 bg-muted rounded animate-pulse" />
          </div>
        </header>
        <div className="px-5">
          <SkeletonList count={3} type="card" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center justify-center size-10 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <Icon icon="solar:alt-arrow-left-linear" width="20" height="20" />
            </button>
            <h1 className="text-2xl font-bold font-heading text-foreground">お知らせ管理</h1>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <Icon icon="solar:add-circle-bold" width="18" height="18" />
            新規作成
          </button>
        </div>

        {/* ステータスフィルター */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          {[
            { id: 'all' as StatusFilter, label: 'すべて', count: announcements.length },
            { id: 'published' as StatusFilter, label: '公開中', count: statusCounts.published },
            { id: 'draft' as StatusFilter, label: '下書き', count: statusCounts.draft },
            { id: 'expired' as StatusFilter, label: '終了', count: statusCounts.expired },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setStatusFilter(filter.id)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 min-h-[44px] ${
                statusFilter === filter.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground font-normal'
              }`}
            >
              {filter.label}
              {filter.count > 0 && <span className="text-[10px] opacity-70">({filter.count})</span>}
            </button>
          ))}
        </div>
      </header>

      <main className="px-5">
        {filteredAnnouncements.length === 0 ? (
          <EmptyState
            icon="solar:megaphone-linear"
            title={statusFilter === 'all' ? 'お知らせがありません' : `${getStatusLabel(statusFilter as 'published' | 'draft' | 'expired')}のお知らせはありません`}
            description="新しいお知らせを作成して飼い主さんに情報を発信しましょう"
            action={{
              label: '新規作成',
              onClick: () => openModal(),
              icon: 'solar:add-circle-bold',
            }}
          />
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((announcement) => {
              const status = getStatus(announcement)
              return (
                <button
                  key={announcement.id}
                  onClick={() => openModal(announcement)}
                  className="w-full bg-card rounded-xl border border-border p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* 画像サムネイル */}
                    {announcement.image_url ? (
                      <div className="size-16 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img
                          src={announcement.image_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="size-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon icon="solar:megaphone-bold" className="size-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.is_important && (
                          <Icon icon="solar:star-bold" className="size-4 text-chart-4" />
                        )}
                        <h3 className="font-bold text-sm truncate">{announcement.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {announcement.content}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                        {announcement.published_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(announcement.published_at).toLocaleDateString('ja-JP')}〜
                          </span>
                        )}
                      </div>
                    </div>

                    <Icon icon="solar:alt-arrow-right-linear" className="size-5 text-muted-foreground shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* 作成・編集モーダル */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal}></div>
          <div className="relative bg-background w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingAnnouncement ? 'お知らせを編集' : '新しいお知らせ'}
              </h2>
              <button
                onClick={closeModal}
                className="size-10 rounded-lg bg-muted flex items-center justify-center"
              >
                <Icon icon="solar:close-circle-bold" width="24" height="24" />
              </button>
            </div>

            <form id="announcement-form" onSubmit={handleSubmit} className="p-5 pb-8 space-y-4">
              {/* タイトル */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  タイトル <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                  placeholder="お知らせのタイトル"
                  required
                />
              </div>

              {/* 本文 */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  本文 <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  className="w-full bg-input border border-border rounded-lg p-3 text-sm min-h-[120px] resize-none"
                  placeholder="お知らせの内容を入力..."
                  required
                />
              </div>

              {/* 画像 */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  画像（任意）
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {formData.image_url ? (
                  <div className="relative">
                    <img
                      src={formData.image_url}
                      alt="プレビュー"
                      className="w-full h-40 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 size-8 bg-black/50 rounded-full flex items-center justify-center text-white"
                    >
                      <Icon icon="solar:close-circle-bold" width="20" height="20" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                  >
                    {uploading ? (
                      <Icon icon="solar:spinner-bold" className="size-6 animate-spin" />
                    ) : (
                      <>
                        <Icon icon="solar:camera-add-bold" className="size-8" />
                        <span className="text-xs">タップして画像を追加</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 重要フラグ */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, is_important: !prev.is_important }))}
                  className={`size-6 rounded border-2 flex items-center justify-center transition-colors ${
                    formData.is_important
                      ? 'bg-chart-4 border-chart-4 text-white'
                      : 'border-border'
                  }`}
                >
                  {formData.is_important && (
                    <Icon icon="solar:check-bold" width="16" height="16" />
                  )}
                </button>
                <label className="text-sm">重要なお知らせとして表示</label>
              </div>

              {/* 公開開始日時 */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  公開開始日時
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={formData.published_at}
                    onChange={(e) => setFormData((prev) => ({ ...prev, published_at: e.target.value }))}
                    className="flex-1 bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={publishNow}
                    className="px-3 py-2 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 min-h-[44px]"
                  >
                    今すぐ
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  空欄の場合は下書き状態になります
                </p>
              </div>

              {/* 公開終了日時 */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  公開終了日時（任意）
                </label>
                <input
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData((prev) => ({ ...prev, expires_at: e.target.value }))}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  空欄の場合は無期限で公開されます
                </p>
              </div>

            </form>

            {/* アクションボタン - 固定フッター */}
            <div className="sticky bottom-0 bg-background border-t border-border px-5 py-4 flex gap-2">
              {editingAnnouncement && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 disabled:opacity-50 min-h-[48px]"
                >
                  {deleting ? '削除中...' : '削除'}
                </button>
              )}
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 px-4 py-3 bg-muted text-muted-foreground rounded-lg text-sm font-medium hover:bg-muted/80 min-h-[48px]"
              >
                キャンセル
              </button>
              <button
                type="submit"
                form="announcement-form"
                disabled={saving}
                className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 disabled:opacity-50 min-h-[48px]"
              >
                {saving ? '保存中...' : editingAnnouncement ? '更新' : '作成'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnnouncementList
