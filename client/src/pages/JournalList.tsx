import React, { useMemo, useState, useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher, PaginatedResponse } from '../lib/swr'
import { Pagination } from '../components/Pagination'

interface Journal {
  id: number
  dog_id: number
  dog_name: string
  dog_photo?: string | null
  owner_name: string
  staff_name?: string | null
  journal_date: string
  comment?: string | null
}

const PAGE_SIZE = 50

const JournalCard = React.memo(function JournalCard({
  journal,
  onNavigate,
}: {
  journal: Journal
  onNavigate: (id: number) => void
}) {
  return (
    <div
      onClick={() => onNavigate(journal.id)}
      className="bg-card rounded-2xl p-4 border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-2">
        {journal.dog_photo ? (
          <img
            src={journal.dog_photo}
            alt={journal.dog_name}
            className="size-12 rounded-full object-cover"
          />
        ) : (
          <div className="size-12 rounded-full bg-muted flex items-center justify-center">
            <Icon icon="solar:paw-print-bold"
              width="24"
              height="24"
              className="text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">{journal.dog_name}</h3>
          <p className="text-xs text-muted-foreground truncate">
            {journal.owner_name} 様 / {journal.staff_name || '担当未設定'}
          </p>
        </div>
        <Icon icon="solar:alt-arrow-right-linear"
          width="20"
          height="20"
          className="text-muted-foreground shrink-0" />
      </div>
      {journal.comment && (
        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{journal.comment}</p>
      )}
    </div>
  )
})

const JournalList = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDog, setSelectedDog] = useState<string>('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()

  const { data, isLoading } = useSWR<PaginatedResponse<Journal>>(
    `/journals?page=${page}&limit=${PAGE_SIZE}`,
    fetcher,
    { revalidateOnFocus: false }
  )
  const journals = data?.data ?? []
  const pagination = data?.pagination

  const handleNavigateJournal = useCallback((id: number) => {
    navigate(`/journals/${id}`)
  }, [navigate])

  // 3つの計算を1回のループで統合処理（パフォーマンス最適化）
  const { uniqueDogs, filteredJournals, groupedJournals } = useMemo(() => {
    const dogMap = new Map<number, { id: number; name: string }>()
    const filtered: any[] = []
    const groups: { [key: string]: any[] } = {}
    const query = searchQuery.toLowerCase()

    for (const journal of journals) {
      // ユニークな犬の収集
      if (!dogMap.has(journal.dog_id)) {
        dogMap.set(journal.dog_id, { id: journal.dog_id, name: journal.dog_name })
      }

      // フィルタリング
      const matchesSearch = searchQuery === '' ||
        journal.dog_name.toLowerCase().includes(query) ||
        journal.owner_name.toLowerCase().includes(query) ||
        (journal.comment && journal.comment.toLowerCase().includes(query))
      const matchesDog = selectedDog === '' || journal.dog_id.toString() === selectedDog

      if (matchesSearch && matchesDog) {
        filtered.push(journal)
        // グループ化も同時実行
        const date = journal.journal_date
        if (!groups[date]) groups[date] = []
        groups[date].push(journal)
      }
    }

    return {
      uniqueDogs: Array.from(dogMap.values()),
      filteredJournals: filtered,
      groupedJournals: groups
    }
  }, [journals, searchQuery, selectedDog])

  // CSVエクスポート機能
  const exportToCSV = () => {
    const headers = ['日付', '犬名', '飼い主', '担当スタッフ', 'コメント']
    const rows = filteredJournals.map((journal) => [
      journal.journal_date,
      journal.dog_name,
      journal.owner_name,
      journal.staff_name || '',
      journal.comment?.replace(/"/g, '""') || '',
    ])

    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `日誌一覧_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

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
          <h1 className="text-2xl font-bold font-heading text-foreground">日誌一覧</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2.5 rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors min-h-[44px]"
            >
              <Icon icon="solar:export-bold" width="18" height="18" />
              CSV出力
            </button>
            <button
              onClick={() => navigate('/reservations')}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium active:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:pen-new-square-bold" width="18" height="18" />
              予約から作成
            </button>
          </div>
        </div>

        {/* 検索・フィルタ */}
        <div className="space-y-3">
          <div className="relative">
            <Icon icon="solar:magnifer-linear"
              width="20"
              height="20"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="犬名・飼い主名・コメントで検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="日誌を検索"
              className="w-full pl-10 pr-4 py-2.5 bg-muted border-none rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="検索をクリア"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <Icon icon="solar:close-circle-bold" width="20" height="20" aria-hidden="true" />
              </button>
            )}
          </div>

          {uniqueDogs.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <button
                onClick={() => setSelectedDog('')}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors min-h-[44px] ${
                  selectedDog === ''
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80 font-normal'
                }`}
              >
                すべて
              </button>
              {uniqueDogs.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => setSelectedDog(dog.id.toString())}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors min-h-[44px] ${
                    selectedDog === dog.id.toString()
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 font-normal'
                  }`}
                >
                  {dog.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="px-5 space-y-6">
        {journals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="size-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Icon icon="solar:notebook-bold" width="40" height="40" className="text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-foreground mb-2">日誌がありません</p>
            <p className="text-sm text-muted-foreground mb-6">予約カレンダーから日誌を作成できます</p>
            <button
              onClick={() => navigate('/reservations')}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium active:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:calendar-bold" width="20" height="20" />
              予約カレンダーを開く
            </button>
          </div>
        ) : filteredJournals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Icon icon="solar:magnifer-linear" width="48" height="48" className="text-muted-foreground mb-4" />
            <p className="text-base font-medium text-foreground mb-1">該当する日誌がありません</p>
            <p className="text-sm text-muted-foreground">検索条件を変更してください</p>
          </div>
        ) : (
          Object.entries(groupedJournals).map(([date, dateJournals]) => (
            <div key={date}>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Icon icon="solar:calendar-linear" width="16" height="16" />
                {new Date(date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{dateJournals.length}件</span>
              </h2>
              <div className="space-y-3">
                {dateJournals.map((journal) => (
                  <JournalCard
                    key={journal.id}
                    journal={journal}
                    onNavigate={handleNavigateJournal}
                  />
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

export default JournalList
