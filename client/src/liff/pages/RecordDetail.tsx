import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { Icon } from '../../components/Icon'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getAvatarUrl, getDetailThumbnailUrl } from '../../utils/image'
import { getBusinessTypeConfig, getRecordLabel } from '../../domain/businessTypeConfig'
import { liffFetcher } from '../lib/swr'
import { useLiffAuthStore } from '../store/authStore'
import { LazyImage } from '../../components/LazyImage'
import { normalizePhotosData } from '../../utils/recordPhotos'
import type { PhotosData } from '../../types/record'
import PhotoViewer from '../components/PhotoViewer'

interface RecordData {
  id: number
  record_type: 'grooming' | 'daycare' | 'hotel'
  record_date: string
  dog_name: string
  dog_photo: string
  dog_breed: string
  dog_birth_date: string
  staff_name: string
  grooming_data: { selectedParts: string[]; partNotes: Record<string, string> } | null
  daycare_data: {
    activities?: string[]
    training?: {
      items: Record<string, string>
      item_notes?: Record<string, string>
      item_labels?: Record<string, string>
      note?: string
    }
    meal?: { morning?: string; afternoon?: string }
    toilet?: Record<string, { urination: boolean; defecation: boolean }>
  } | null
  hotel_data: {
    check_in: string
    check_out_scheduled: string
    nights: number
    special_care?: string
    daily_notes?: Record<string, string>
    care_logs?: Array<{
      at: string
      category: 'feeding' | 'medication' | 'toilet' | 'walk'
      note: string
      staff?: string
    }>
  } | null
  photos: PhotosData | null
  notes: { internal_notes: string | null; report_text: string | null } | null
  condition: { overall: string } | null
  health_check: { weight?: number; ears?: string; nails?: string; skin?: string; teeth?: string } | null
  shared_at: string
  created_at: string
}

const CONDITION_LABELS: Record<string, { emoji: string; label: string }> = {
  excellent: { emoji: '😆', label: 'とても元気' },
  good: { emoji: '😊', label: '元気' },
  normal: { emoji: '😐', label: 'ふつう' },
  tired: { emoji: '😔', label: 'やや疲れ気味' },
  observe: { emoji: '🤒', label: '要観察' },
}

const PART_LABELS: Record<string, string> = {
  head: '頭', face: '顔', ears: '耳', body: '体',
  tail: 'しっぽ', front_legs: '前足', back_legs: '後足', hip: 'お尻',
}

const ACTIVITY_LABELS: Record<string, { label: string; emoji: string }> = {
  freeplay: { label: 'フリープレイ', emoji: '🎾' },
  training: { label: 'トレーニング', emoji: '📚' },
  walk: { label: 'お散歩', emoji: '🚶' },
  nap: { label: 'お昼寝', emoji: '😴' },
  socialization: { label: '社会化', emoji: '🐕' },
}

const TRAINING_ACHIEVEMENT_LABELS: Record<string, { label: string; className: string }> = {
  done: { label: '○', className: 'text-green-600 bg-green-50' },
  almost: { label: '△', className: 'text-yellow-600 bg-yellow-50' },
  not_done: { label: '−', className: 'text-muted-foreground bg-muted/50' },
  A: { label: 'A', className: 'text-blue-600 bg-blue-50' },
  B: { label: 'B', className: 'text-blue-600 bg-blue-50' },
  C: { label: 'C', className: 'text-indigo-600 bg-indigo-50' },
  D: { label: 'D', className: 'text-violet-600 bg-violet-50' },
  E: { label: 'E', className: 'text-purple-600 bg-purple-50' },
  F: { label: 'F', className: 'text-purple-600 bg-purple-50' },
}

const HOTEL_CARE_CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  feeding: { label: '食事', icon: 'mdi:food-drumstick' },
  medication: { label: '投薬', icon: 'mdi:pill' },
  toilet: { label: '排泄', icon: 'mdi:toilet' },
  walk: { label: '散歩', icon: 'mdi:walk' },
}

export default function RecordDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const selectedBusinessType = useLiffAuthStore((s) => s.selectedBusinessType || s.owner?.primaryBusinessType || 'daycare')
  const [viewerState, setViewerState] = useState<{
    photos: { url: string; label?: string }[]
    initialIndex: number
    title?: string
  } | null>(null)

  const { data: record, isLoading, error } = useSWR<RecordData>(
    id ? `/records/${id}` : null,
    liffFetcher
  )
  const recordLabel = record ? getRecordLabel(record.record_type) : getRecordLabel(selectedBusinessType)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold" width="48" height="48" className="text-primary animate-spin" />
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="px-5 pt-6 pb-28 text-center">
        <Icon icon="solar:clipboard-remove-bold" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">{recordLabel}が見つかりません</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm font-medium active:scale-[0.98] transition-all">
          戻る
        </button>
      </div>
    )
  }

  const typeConfig = getBusinessTypeConfig(record.record_type)
  const normalizedPhotos = normalizePhotosData(record.photos || { regular: [], concerns: [] })
  const photoList = normalizedPhotos.regular || []
  const concerns = normalizedPhotos.concerns || []
  const viewerPhotos = photoList.map((photo) => ({
    url: getDetailThumbnailUrl(photo.url),
  }))
  const viewerConcerns = concerns.map((photo) => ({
    url: getDetailThumbnailUrl(photo.url),
    label: photo.label,
  }))
  const hasBeforeAfter = record.record_type === 'grooming' && viewerPhotos.length >= 2
  const hotelDailyNotes = record.hotel_data?.daily_notes
    ? Object.entries(record.hotel_data.daily_notes).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    : []
  const hotelCareLogs = (record.hotel_data?.care_logs || [])
    .filter((log) => log?.at && log?.category)
    .slice()
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  const groomingParts = record.grooming_data?.selectedParts || []
  const groomingNotes = record.grooming_data?.partNotes || {}

  return (
    <div className="px-5 pt-6 pb-28">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted active:scale-95 transition-all"
          aria-label="戻る"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">{recordLabel}詳細</h1>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{ background: `${typeConfig.colors.primary}15`, color: typeConfig.colors.primary }}
        >
          {typeConfig.label}
        </span>
      </div>

      {/* ペット情報 */}
      <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
        <div className="flex items-center gap-3">
          {record.dog_photo ? (
            <LazyImage
              src={getAvatarUrl(record.dog_photo)}
              alt={record.dog_name}
              width={56}
              height={56}
              className="size-14 rounded-full border-2 border-primary/20"
            />
          ) : (
            <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <Icon icon="solar:paw-print-bold" width="28" height="28" className="text-primary" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-base">{record.dog_name}</h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(record.record_date), 'yyyy年M月d日（E）', { locale: ja })}
            </p>
            {record.staff_name && (
              <p className="text-xs text-muted-foreground">担当: {record.staff_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* 業種固有セクション */}
      {record.record_type === 'grooming' && record.grooming_data && (
        <>
          <section className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Icon icon="solar:scissors-bold" width="16" height="16" className="text-violet-500" />
              施術内容
            </h3>
            {groomingParts.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {groomingParts.map((part) => (
                  <div key={part} className="bg-muted/50 rounded-xl p-3">
                    <p className="text-xs font-medium text-muted-foreground">{PART_LABELS[part] || part}</p>
                    <p className="text-sm mt-1">{groomingNotes?.[part] || '施術済み'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">施術内容の記録はありません</p>
            )}
          </section>

          {hasBeforeAfter && (
            <section className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
              <h3 className="text-sm font-bold mb-3">ビフォーアフター</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setViewerState({ photos: viewerPhotos, initialIndex: 0, title: 'ビフォーアフター' })}
                  className="active:scale-[0.98] transition-all"
                >
                  <p className="text-xs text-center text-muted-foreground mb-1">Before</p>
                  <LazyImage src={viewerPhotos[0].url} alt="Before" className="rounded-xl aspect-square object-cover" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewerState({ photos: viewerPhotos, initialIndex: 1, title: 'ビフォーアフター' })}
                  className="active:scale-[0.98] transition-all"
                >
                  <p className="text-xs text-center text-muted-foreground mb-1">After</p>
                  <LazyImage src={viewerPhotos[1].url} alt="After" className="rounded-xl aspect-square object-cover" />
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {record.record_type === 'daycare' && record.daycare_data && (() => {
        const activities = record.daycare_data.activities || []
        const hasTrainingItems = Object.entries(record.daycare_data.training?.items || {}).some(([, v]) => v && v !== '')
        const hasActivities = activities.length > 0

        return (
          <>
            {/* 旧「今日の活動」（後方互換） */}
            {!hasTrainingItems && hasActivities && (
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Icon icon="solar:sun-bold" width="16" height="16" className="text-orange-500" />
                  今日の活動
                </h3>
                <div className="flex flex-wrap gap-2">
                  {activities.map((activity) => {
                    const config = ACTIVITY_LABELS[activity]
                    return (
                      <span key={activity} className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-200">
                        {config ? `${config.emoji} ${config.label}` : activity}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ごはん */}
            {(record.daycare_data.meal?.morning || record.daycare_data.meal?.afternoon) && (
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Icon icon="mdi:silverware-fork-knife" width="16" height="16" className="text-orange-500" />
                  ごはん
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {record.daycare_data.meal?.morning && (
                    <div>
                      <span className="text-xs text-muted-foreground">朝</span>
                      <p className="text-sm">{record.daycare_data.meal.morning}</p>
                    </div>
                  )}
                  {record.daycare_data.meal?.afternoon && (
                    <div>
                      <span className="text-xs text-muted-foreground">午後</span>
                      <p className="text-sm">{record.daycare_data.meal.afternoon}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* トイレ */}
            {record.daycare_data.toilet && Object.keys(record.daycare_data.toilet).length > 0 && (
              <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Icon icon="mdi:toilet" width="16" height="16" className="text-orange-500" />
                  トイレ
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(record.daycare_data.toilet).map(([slot, data]) => (
                    <div key={slot} className="bg-muted/30 rounded-xl p-2 min-w-[80px] text-center">
                      <p className="text-xs text-muted-foreground mb-1">{slot}</p>
                      <div className="flex justify-center gap-1.5">
                        {data.urination && <span className="text-xs text-blue-500">💧</span>}
                        {data.defecation && <span className="text-xs text-amber-600">💩</span>}
                        {!data.urination && !data.defecation && <span className="text-xs text-muted-foreground">−</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )
      })()}

      {record.record_type === 'hotel' && record.hotel_data && (
        <>
          <section className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Icon icon="solar:moon-bold" width="16" height="16" className="text-cyan-500" />
              宿泊情報（{record.hotel_data.nights}泊）
            </h3>
            {record.hotel_data.special_care && (
              <p className="text-sm text-foreground mb-2">
                <span className="text-xs text-muted-foreground">特別ケア: </span>
                {record.hotel_data.special_care}
              </p>
            )}
          </section>

          {hotelDailyNotes.length > 0 && (
            <section className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
              <h3 className="text-sm font-bold mb-3">お預かりレポート</h3>
              <div className="space-y-4">
                {hotelDailyNotes.map(([date, note]) => (
                  <div key={date} className="border-l-2 border-primary/30 pl-3">
                    <p className="text-xs font-medium text-muted-foreground">
                      {format(new Date(date), 'M月d日(E)', { locale: ja })}
                    </p>
                    <p className="text-sm mt-1">{note}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {hotelCareLogs.length > 0 && (
            <section className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
              <h3 className="text-sm font-bold mb-3">滞在ログ</h3>
              <div className="space-y-2">
                {hotelCareLogs.map((log, index) => {
                  const category = HOTEL_CARE_CATEGORY_LABELS[log.category]
                  return (
                    <div key={`${log.at}-${index}`} className="rounded-xl border border-border p-3 bg-muted/20">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Icon icon={category?.icon || 'solar:clipboard-list-bold'} width="14" height="14" />
                          {category?.label || log.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.at), 'M月d日(E) HH:mm', { locale: ja })}
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-sm mt-1.5">{log.note}</p>
                      )}
                      {log.staff && (
                        <p className="text-xs text-muted-foreground mt-1">担当: {log.staff}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* 体調 */}
      {record.condition && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-2">体調・様子</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{CONDITION_LABELS[record.condition.overall]?.emoji || '😐'}</span>
            <span className="text-sm font-medium">{CONDITION_LABELS[record.condition.overall]?.label || record.condition.overall}</span>
          </div>
        </div>
      )}

      {/* 報告文 */}
      {record.notes?.report_text && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-2">スタッフからの報告</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {record.notes.report_text}
          </p>
        </div>
      )}

      {/* 写真 */}
      {photoList.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">写真</h3>
          <div className="grid grid-cols-2 gap-2">
            {photoList.map((_photo, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setViewerState({ photos: viewerPhotos, initialIndex: idx, title: '写真' })}
                className="active:scale-[0.98] transition-all"
              >
                <LazyImage
                  src={viewerPhotos[idx].url}
                  alt={`${record.dog_name}の写真 ${idx + 1}`}
                  width={200}
                  height={200}
                  className="w-full aspect-square rounded-xl object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 気になる箇所 */}
      {concerns.length > 0 && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3 text-red-500">気になる箇所</h3>
          <div className="grid grid-cols-2 gap-2">
            {concerns.map((concern, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => setViewerState({ photos: viewerConcerns, initialIndex: idx, title: '気になる箇所' })}
                className="relative active:scale-[0.98] transition-all"
              >
                <LazyImage
                  src={viewerConcerns[idx].url}
                  alt={concern.label || `気になる箇所 ${idx + 1}`}
                  width={200}
                  height={200}
                  className="w-full aspect-square rounded-xl object-cover"
                />
                {concern.label && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-b-xl text-center">
                    {concern.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* トレーニング記録（写真・報告の後に表示） */}
      {record.record_type === 'daycare' && record.daycare_data?.training && (() => {
        const trainingItems = record.daycare_data.training.items || {}
        const itemLabels = record.daycare_data.training.item_labels || {}
        const filledItems = Object.entries(trainingItems).filter(([, v]) => v && v !== '')
        const trainingNote = record.daycare_data.training.note

        if (filledItems.length === 0) return null

        return (
          <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Icon icon="mdi:book-open-page-variant" width="16" height="16" className="text-orange-500" />
              トレーニング記録
            </h3>
            <div className="space-y-1.5">
              {filledItems.map(([key, value]) => {
                const achievement = TRAINING_ACHIEVEMENT_LABELS[value]
                const itemNote = record.daycare_data?.training?.item_notes?.[key]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
                      <span className="text-sm">{itemLabels[key] || key}</span>
                      {achievement && (
                        <span className={`size-8 rounded-full flex items-center justify-center text-sm font-bold ${achievement.className}`}>
                          {achievement.label}
                        </span>
                      )}
                    </div>
                    {itemNote && (
                      <p className="text-xs text-muted-foreground mt-0.5 ml-3">{itemNote}</p>
                    )}
                  </div>
                )
              })}
            </div>
            {trainingNote && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-1">メモ</p>
                <p className="text-sm whitespace-pre-wrap">{trainingNote}</p>
              </div>
            )}
          </div>
        )
      })()}

      {/* 健康チェック */}
      {record.health_check && (
        <div className="bg-card rounded-2xl p-4 border border-border shadow-sm mb-4">
          <h3 className="text-sm font-bold mb-3">健康チェック</h3>
          <div className="grid grid-cols-2 gap-3">
            {record.health_check.weight && (
              <div>
                <span className="text-xs text-muted-foreground">体重</span>
                <p className="text-sm font-medium">{record.health_check.weight} kg</p>
              </div>
            )}
            {record.health_check.ears && (
              <div>
                <span className="text-xs text-muted-foreground">耳</span>
                <p className="text-sm font-medium">{record.health_check.ears}</p>
              </div>
            )}
            {record.health_check.nails && (
              <div>
                <span className="text-xs text-muted-foreground">爪</span>
                <p className="text-sm font-medium">{record.health_check.nails}</p>
              </div>
            )}
            {record.health_check.skin && (
              <div>
                <span className="text-xs text-muted-foreground">皮膚</span>
                <p className="text-sm font-medium">{record.health_check.skin}</p>
              </div>
            )}
            {record.health_check.teeth && (
              <div>
                <span className="text-xs text-muted-foreground">歯</span>
                <p className="text-sm font-medium">{record.health_check.teeth}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {viewerState && (
        <PhotoViewer
          photos={viewerState.photos}
          initialIndex={viewerState.initialIndex}
          title={viewerState.title}
          onClose={() => setViewerState(null)}
        />
      )}
    </div>
  )
}
