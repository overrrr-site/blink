import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import type { PaginatedResponse } from '../types/api'
import type { RecordItem, RecordType } from '../types/record'
import { Pagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { getBusinessTypeColors, getBusinessTypeLabel, getRecordLabel } from '../utils/businessTypeColors'
import { useAuthStore } from '../store/authStore'

const PAGE_SIZE = 50

function RecordTypeBadge({ type }: { type: RecordType }) {
  const colors = getBusinessTypeColors(type)
  const label = getBusinessTypeLabel(type)
  return (
    <span
      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ color: colors.primary, backgroundColor: colors.pale }}
    >
      {label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: '#F1F5F9', text: '#64748B', label: '下書き' },
    saved: { bg: '#FEF3C7', text: '#D97706', label: '保存済み' },
    shared: { bg: '#ECFDF5', text: '#059669', label: '共有済み' },
  }
  const s = styles[status] || styles.draft
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ color: s.text, backgroundColor: s.bg }}
    >
      {s.label}
    </span>
  )
}

const RecordCard = React.memo(function RecordCard({
  record,
  onNavigate,
}: {
  record: RecordItem
  onNavigate: (id: number) => void
}) {
  const colors = getBusinessTypeColors(record.record_type)

  return (
    <div
      onClick={() => onNavigate(record.id)}
      className="bg-card rounded-2xl p-4 border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderLeftWidth: 3, borderLeftColor: colors.primary }}
    >
      <div className="flex items-center gap-3 mb-2">
        {record.dog_photo ? (
          <img
            src={record.dog_photo}
            alt={record.dog_name || ''}
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div className="size-12 rounded-full bg-muted flex items-center justify-center">
            <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">{record.dog_name}</h3>
            <RecordTypeBadge type={record.record_type} />
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {record.owner_name} 様 / {record.staff_name || '担当未設定'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={record.status} />
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </div>
      </div>
      {record.notes?.report_text && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{record.notes.report_text}</p>
      )}
    </div>
  )
})

const RECORD_TYPE_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: 'すべて' },
  { value: 'grooming', label: 'グルーミング' },
  { value: 'daycare', label: '幼稚園' },
  { value: 'hotel', label: 'ホテル' },
]

const RecordList = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const primaryBusinessType = useAuthStore((s) => s.user?.primaryBusinessType)
  const recordLabel = getRecordLabel(primaryBusinessType)

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedType])

  const swrKey = `/records?page=${page}&limit=${PAGE_SIZE}${debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : ''}${selectedType ? `&record_type=${selectedType}` : ''}`
  const { data, isLoading } = useSWR<PaginatedResponse<RecordItem>>(
    swrKey,
    fetcher,
    { revalidateOnFocus: false }
  )
  const records = data?.data ?? []
  const pagination = data?.pagination

  const handleNavigateRecord = useCallback((id: number) => {
    navigate(`/records/${id}`)
  }, [navigate])

  // 日付グルーピング
  const groupedRecords = useMemo(() => {
    const groups: Record<string, RecordItem[]> = {}
    for (const record of records) {
      const date = record.record_date
      if (!groups[date]) groups[date] = []
      groups[date].push(record)
    }
    return groups
  }, [records])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">{recordLabel}一覧</h1>
          <button
            onClick={() => navigate('/records/new')}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium active:bg-primary/90 transition-colors min-h-[44px]"
          >
            <Icon icon="solar:pen-new-square-bold" width="18" height="18" />
            {recordLabel}作成
          </button>
        </div>

        {/* 検索 */}
        <div className="space-y-3">
          <div className="relative">
            <Icon
              icon="solar:magnifer-linear"
              width="20"
              height="20"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="ワンちゃん名・飼い主名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={`${recordLabel}を検索`}
              className="w-full pl-10 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="検索をクリア"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon icon="solar:close-circle-bold" width="20" height="20" />
              </button>
            )}
          </div>

          {/* 業種フィルター */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {RECORD_TYPE_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setSelectedType(value)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors min-h-[44px] ${
                  selectedType === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 font-normal'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-5 space-y-6">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icon icon="solar:clipboard-list-bold" width="40" height="40" className="text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">{recordLabel}がありません</p>
            <p className="text-sm text-muted-foreground mb-6">新規{recordLabel}を作成してください</p>
            <button
              onClick={() => navigate('/records/new')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium active:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:pen-new-square-bold" width="20" height="20" />
              {recordLabel}を作成
            </button>
          </div>
        ) : (
          Object.entries(groupedRecords).map(([date, dateRecords]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Icon icon="solar:calendar-linear" width="16" height="16" />
                {new Date(date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{dateRecords.length}件</span>
              </h2>
              <div className="space-y-3">
                {dateRecords.map((record) => (
                  <RecordCard key={record.id} record={record} onNavigate={handleNavigateRecord} />
                ))}
              </div>
            </div>
          ))
        )}
        {pagination && pagination.totalPages > 1 && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        )}
      </main>
    </div>
  )
}

export default RecordList
