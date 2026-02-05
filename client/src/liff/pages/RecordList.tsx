import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { getAvatarUrl, getListThumbnailUrl } from '../../utils/image'
import { usePaginatedData } from '../hooks/usePaginatedData'
import { LazyImage } from '../../components/LazyImage'

interface LiffRecord {
  id: number
  record_type: 'grooming' | 'daycare' | 'hotel'
  record_date: string
  dog_name: string
  dog_photo: string
  staff_name: string
  notes: { report_text?: string | null } | null
  photos: { regular?: string[] } | null
  condition: { overall?: string } | null
  shared_at: string
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  grooming: { label: 'グルーミング', color: '#8B5CF6', icon: 'solar:scissors-bold' },
  daycare: { label: '幼稚園', color: '#F97316', icon: 'solar:sun-bold' },
  hotel: { label: 'ホテル', color: '#06B6D4', icon: 'solar:moon-bold' },
}

export default function RecordList() {
  const navigate = useNavigate()
  const [refreshing, setRefreshing] = useState(false)
  const {
    data: records,
    isLoading,
    isLoadingMore,
    hasMore,
    sentinelRef,
    mutate,
  } = usePaginatedData<LiffRecord>({
    baseUrl: '/records',
    limit: 20,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await mutate()
    } finally {
      setRefreshing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold" width="48" height="48" className="text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-28">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">カルテ一覧</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-full transition-colors active:scale-95 disabled:opacity-50"
          aria-label="更新"
        >
          <Icon icon="solar:refresh-linear" width="24" height="24" className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {refreshing && (
        <div className="flex items-center justify-center py-2 mb-4">
          <Icon icon="solar:spinner-bold" width="20" height="20" className="text-primary animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">更新中...</span>
        </div>
      )}

      {records.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center">
          <Icon icon="solar:clipboard-text-linear" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-2">カルテがまだありません</p>
          <p className="text-xs text-muted-foreground">
            施術・登園後にスタッフがカルテを作成・共有します
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{records.length}件のカルテ</p>

          {records.map((record) => {
            const typeConfig = TYPE_CONFIG[record.record_type] || TYPE_CONFIG.daycare
            const photoList = record.photos?.regular || []
            const reportText = record.notes?.report_text || ''

            return (
              <button
                key={record.id}
                onClick={() => navigate(`/home/records/${record.id}`)}
                className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left hover:bg-muted/50 active:bg-muted active:scale-[0.99] transition-all"
                aria-label={`${record.dog_name}の${format(new Date(record.record_date), 'M月d日')}のカルテを見る`}
              >
                <div className="flex items-center gap-3 mb-3">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base">{record.dog_name}</h3>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${typeConfig.color}15`, color: typeConfig.color }}
                      >
                        {typeConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Icon icon="solar:calendar-linear" width="16" height="16" />
                      {format(new Date(record.record_date), 'yyyy年M月d日', { locale: ja })}
                    </p>
                    {record.staff_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Icon icon="solar:user-linear" width="14" height="14" />
                        {record.staff_name}
                      </p>
                    )}
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground shrink-0" />
                </div>

                {reportText && (
                  <p className="text-sm text-foreground line-clamp-2 mb-3 pl-1">{reportText}</p>
                )}

                {photoList.length > 0 && (
                  <div className="flex gap-2">
                    {photoList.slice(0, 3).map((photo, idx) => (
                      <div key={idx} className="relative">
                        <LazyImage
                          src={getListThumbnailUrl(photo)}
                          alt={`${record.dog_name}の写真 ${idx + 1}`}
                          width={80}
                          height={80}
                          className="size-20 rounded-lg"
                        />
                        {idx === 0 && photoList.length > 0 && (
                          <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                            {photoList.length}枚
                          </div>
                        )}
                      </div>
                    ))}
                    {photoList.length > 3 && (
                      <div className="size-20 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground">
                          +{photoList.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}

          {hasMore && <div ref={sentinelRef} className="h-10" />}
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Icon icon="solar:spinner-bold" width="20" height="20" className="text-primary animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">読み込み中...</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
