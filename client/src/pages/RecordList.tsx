import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import api from '../api/client'
import { fetcher } from '../lib/swr'
import type { PaginatedResponse } from '../types/api'
import type { RecordItem, RecordType } from '../types/record'
import { Pagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import {
  getBusinessTypeColors,
  getBusinessTypeLabel,
  RECORD_TYPE_FILTERS,
} from '../domain/businessTypeConfig'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import BusinessTypeSwitcher from '../components/BusinessTypeSwitcher'

const PAGE_SIZE = 50

interface StaffFilterItem {
  id: number
  name: string
}

interface DogFilterItem {
  id: number
  name: string
}

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

function ShareBadge({ sharedAt, status }: { sharedAt?: string | null; status: string }) {
  if (sharedAt) {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
        送信済
      </span>
    )
  }
  if (status === 'saved') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-amber-600 bg-amber-50">
        未送信
      </span>
    )
  }
  return null
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
          <ShareBadge sharedAt={record.shared_at} status={record.status} />
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </div>
      </div>
      {record.notes?.report_text && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{record.notes.report_text}</p>
      )}
    </div>
  )
})

const RecordList = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedDogId, setSelectedDogId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [downloading, setDownloading] = useState(false)
  const navigate = useNavigate()
  const { recordLabel } = useBusinessTypeFilter()

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedType, selectedDogId, selectedStaffId, dateFrom, dateTo])

  const { data: staffItems } = useSWR<StaffFilterItem[]>('/staff', fetcher, { revalidateOnFocus: false })
  const { data: dogItems } = useSWR<DogFilterItem[]>('/dogs', fetcher, { revalidateOnFocus: false })

  const swrKey = `/records?page=${page}&limit=${PAGE_SIZE}${debouncedSearchQuery ? `&search=${encodeURIComponent(debouncedSearchQuery)}` : ''}${selectedType ? `&record_type=${selectedType}` : ''}${selectedDogId ? `&dog_id=${selectedDogId}` : ''}${selectedStaffId ? `&staff_id=${selectedStaffId}` : ''}${dateFrom ? `&date_from=${dateFrom}` : ''}${dateTo ? `&date_to=${dateTo}` : ''}`
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

  const handleExportCsv = useCallback(async () => {
    setDownloading(true)
    try {
      const response = await api.get('/records/export.csv', {
        params: {
          record_type: selectedType || undefined,
          dog_id: selectedDogId || undefined,
          staff_id: selectedStaffId || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          search: debouncedSearchQuery || undefined,
        },
        responseType: 'blob',
      })

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `records-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      alert('カルテCSVの出力に失敗しました')
    } finally {
      setDownloading(false)
    }
  }, [dateFrom, dateTo, debouncedSearchQuery, selectedDogId, selectedStaffId, selectedType])

  const handlePrint = useCallback(() => {
    api.post('/exports/log', {
      export_type: 'records',
      output_format: 'print',
      filters: {
        record_type: selectedType || null,
        dog_id: selectedDogId || null,
        staff_id: selectedStaffId || null,
        date_from: dateFrom || null,
        date_to: dateTo || null,
        search: debouncedSearchQuery || null,
      },
    }).catch(() => undefined)
    window.print()
  }, [dateFrom, dateTo, debouncedSearchQuery, selectedDogId, selectedStaffId, selectedType])

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
      <div className="hidden print:block print:mb-4 print:border-b print:border-gray-300 print:pb-4 px-5">
        <h1 className="text-xl font-bold">{recordLabel}一覧</h1>
        <p className="text-sm text-gray-600">
          出力日時: {new Date().toLocaleString('ja-JP')}
        </p>
      </div>
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10 safe-area-pt">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">{recordLabel}一覧</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] print:hidden"
              aria-label="印刷"
            >
              <Icon icon="solar:printer-bold" width="18" height="18" />
              印刷
            </button>
            <button
              onClick={handleExportCsv}
              disabled={downloading}
              className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] disabled:opacity-60 print:hidden"
              aria-label="CSV出力"
            >
              <Icon icon="solar:download-bold" width="18" height="18" />
              {downloading ? '出力中...' : 'CSV'}
            </button>
            <BusinessTypeSwitcher />
            <button
              onClick={() => navigate('/records/new')}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium active:bg-primary/90 transition-colors min-h-[44px] print:hidden"
            >
              <Icon icon="solar:pen-new-square-bold" width="18" height="18" />
              {recordLabel}作成
            </button>
          </div>
        </div>

        {/* 検索 */}
        <div className="space-y-3 print:hidden">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 print:hidden">
            <select
              value={selectedDogId}
              onChange={(e) => setSelectedDogId(e.target.value)}
              className="px-3 py-2 bg-muted rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
            >
              <option value="">犬で絞込（全件）</option>
              {(dogItems ?? []).map((dog) => (
                <option key={dog.id} value={dog.id}>
                  {dog.name}
                </option>
              ))}
            </select>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="px-3 py-2 bg-muted rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
            >
              <option value="">担当で絞込（全件）</option>
              {(staffItems ?? []).map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 print:hidden">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-muted rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
              aria-label="開始日"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 bg-muted rounded-lg text-sm border-none focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[44px]"
              aria-label="終了日"
            />
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
