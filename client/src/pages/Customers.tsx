import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import type { PaginatedResponse } from '../types/api'
import { Pagination } from '../components/Pagination'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import BusinessTypeSwitcher from '../components/BusinessTypeSwitcher'
import { LazyImage } from '../components/LazyImage'
import { getListThumbnailUrl } from '../utils/image'

interface Owner {
  id: number
  name: string
  name_kana: string
  phone: string
  line_id?: string | null
  dogs: Dog[]
}

interface Dog {
  id: number
  name: string
  breed: string
  photo_url?: string
}

interface DogWithOwner extends Dog {
  owner_id: number
  owner_name: string
}

const PAGE_SIZE = 50
const HEADER_CLASS = 'px-5 pt-6 pb-4 bg-background sticky top-0 z-10 safe-area-pt'

const OwnerCard = React.memo(function OwnerCard({
  owner,
  onNavigate,
}: {
  owner: Owner
  onNavigate: (id: number) => void
}) {
  const isLineLinked = Boolean(owner.line_id && owner.line_id.trim())

  return (
    <button
      onClick={() => onNavigate(owner.id)}
      className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left hover:shadow-md transition-shadow active:bg-muted/50 min-h-[72px]"
    >
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
          {owner.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-base truncate">{owner.name}</h3>
            {isLineLinked && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border border-chart-2/30 bg-chart-2/10 text-chart-2 whitespace-nowrap">
                LINE連携済
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{owner.phone}</p>
        </div>
          <div className="flex items-center gap-1">
          {(owner.dogs ?? []).slice(0, 3).map((dog) => (
            <div
              key={dog.id}
              className="size-8 rounded-full bg-muted overflow-hidden border-2 border-background -ml-2 first:ml-0"
            >
              {dog.photo_url ? (
                <LazyImage
                  src={getListThumbnailUrl(dog.photo_url)}
                  alt={dog.name}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon icon="solar:paw-print-bold"
                    width={16} height={16}
                    className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {(owner.dogs?.length || 0) > 3 && (
            <span className="text-xs text-muted-foreground ml-1">
              +{owner.dogs.length - 3}
            </span>
          )}
        </div>
        <Icon icon="solar:alt-arrow-right-linear"
          width={24} height={24}
          className="text-muted-foreground"
          aria-hidden="true" />
      </div>
    </button>
  )
})

const DogCard = React.memo(function DogCard({
  dog,
  onNavigate,
}: {
  dog: DogWithOwner
  onNavigate: (id: number) => void
}) {
  return (
    <button
      onClick={() => onNavigate(dog.id)}
      className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left hover:shadow-md transition-shadow active:bg-muted/50 min-h-[72px]"
    >
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-muted overflow-hidden">
          {dog.photo_url ? (
            <LazyImage
              src={getListThumbnailUrl(dog.photo_url)}
              alt={dog.name}
              className="w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon="solar:paw-print-bold"
                width={24} height={24}
                className="text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base">{dog.name}</h3>
          <p className="text-xs text-muted-foreground">{dog.breed}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{dog.owner_name} 様</p>
        </div>
        <Icon icon="solar:alt-arrow-right-linear"
          width={24} height={24}
          className="text-muted-foreground"
          aria-hidden="true" />
      </div>
    </button>
  )
})

const Customers = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'owners' | 'dogs'>('owners')
  const [page, setPage] = useState(1)
  const { selectedBusinessType, serviceTypeParam } = useBusinessTypeFilter()

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearchQuery, selectedBusinessType])

  // 業種フィルタを含むSWRキー
  const serviceTypeQuery = serviceTypeParam ? `&${serviceTypeParam}` : ''
  const listKey = `/owners?search=${encodeURIComponent(debouncedSearchQuery)}&page=${page}&limit=${PAGE_SIZE}${serviceTypeQuery}`
  const { data, isLoading, error, mutate } = useSWR<PaginatedResponse<Owner>>(listKey, fetcher)
  const owners = data?.data ?? []
  const pagination = data?.pagination

  const handleNavigateOwner = useCallback((id: number) => {
    navigate(`/owners/${id}`)
  }, [navigate])

  const handleNavigateDog = useCallback((id: number) => {
    navigate(`/dogs/${id}`)
  }, [navigate])

  // 犬ビュー用のデータ変換（検索はサーバーサイドで完了済み）
  const allDogs = useMemo(() => {
    const dogs: DogWithOwner[] = []
    for (const owner of owners) {
      for (const dog of (owner.dogs || [])) {
        dogs.push({ ...dog, owner_id: owner.id, owner_name: owner.name })
      }
    }
    return dogs
  }, [owners])

  if (isLoading) {
    return (
      <div className="pb-6">
        <header className={HEADER_CLASS}>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-heading text-foreground">顧客管理</h1>
            <BusinessTypeSwitcher variant="pill" />
          </div>
        </header>
        <div className="px-5 pt-4">
          <div className="h-12 bg-muted rounded-xl mb-4 animate-pulse" />
          <SkeletonList count={5} type="card" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-6">
        <header className={HEADER_CLASS}>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-heading text-foreground">顧客管理</h1>
            <BusinessTypeSwitcher variant="pill" />
          </div>
        </header>
        <div className="px-5 pt-10">
          <EmptyState
            icon="solar:danger-triangle-bold"
            title="顧客データの取得に失敗しました"
            description="時間をおいて再読み込みしてください"
            action={{
              label: '再読み込み',
              onClick: () => mutate(),
              icon: 'solar:refresh-bold',
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <header className={HEADER_CLASS}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold font-heading text-foreground">顧客管理</h1>
          <BusinessTypeSwitcher variant="pill" />
        </div>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* 検索バー */}
        <div className="relative md:max-w-md">
          <Icon icon="solar:magnifer-linear"
            width={20} height={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="名前、電話番号、犬種で検索..."
            className="w-full bg-muted border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm focus:shadow-md min-h-[48px]"
            aria-label="検索"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              <Icon icon="solar:close-circle-bold" width={20} height={20} />
            </button>
          )}
        </div>

        {/* 表示切り替え */}
        <div className="flex bg-muted rounded-xl p-1">
          <button
            onClick={() => setViewMode('owners')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-colors relative min-h-[48px] ${
              viewMode === 'owners'
                ? 'bg-background text-foreground shadow-sm border-b-2 border-primary'
                : 'text-muted-foreground font-normal'
            }`}
            aria-label="飼い主一覧を表示"
            aria-pressed={viewMode === 'owners'}
          >
            <Icon icon="solar:user-bold" width={16} height={16} className="mr-1.5 inline-block" />
            飼い主
          </button>
          <button
            onClick={() => setViewMode('dogs')}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-colors relative min-h-[48px] ${
              viewMode === 'dogs'
                ? 'bg-background text-foreground shadow-sm border-b-2 border-primary'
                : 'text-muted-foreground font-normal'
            }`}
            aria-label="ワンちゃん一覧を表示"
            aria-pressed={viewMode === 'dogs'}
          >
            <Icon icon="solar:paw-print-bold" width={16} height={16} className="mr-1.5 inline-block" />
            ワンちゃん
          </button>
        </div>

        {/* 統計 */}
        <div className="flex gap-3">
          <div className="flex-1 bg-card rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground">飼い主</p>
            <p className="text-2xl font-bold">{pagination?.total ?? owners.length}<span className="text-sm font-normal text-muted-foreground">名</span></p>
          </div>
          <div className="flex-1 bg-card rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground">ワンちゃん</p>
            <p className="text-2xl font-bold">{allDogs.length}<span className="text-sm font-normal text-muted-foreground">頭</span></p>
          </div>
        </div>

        {/* リスト表示 */}
        {viewMode === 'owners' ? (
          // 飼い主一覧
          owners.length === 0 ? (
            <EmptyState
              icon="solar:users-group-rounded-linear"
              title={searchQuery ? '検索結果がありません' : '飼い主が登録されていません'}
              description={searchQuery ? '検索条件を変更してください' : '新しい飼い主を登録しましょう'}
              illustration={!searchQuery ? '/images/dog-waiting.webp' : undefined}
              action={
                !searchQuery
                  ? {
                      label: '飼い主を登録',
                      onClick: () => navigate('/owners/new'),
                      icon: 'solar:user-plus-bold',
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
              {owners.map((owner) => (
                <OwnerCard key={owner.id} owner={owner} onNavigate={handleNavigateOwner} />
              ))}
            </div>
          )
        ) : (
          // 犬一覧
          allDogs.length === 0 ? (
            <EmptyState
              icon="solar:paw-print-linear"
              title={searchQuery ? '検索結果がありません' : 'ワンちゃんが登録されていません'}
              description={searchQuery ? '検索条件を変更してください' : '飼い主を登録してワンちゃんを追加しましょう'}
              illustration={!searchQuery ? '/images/dog-waiting.webp' : undefined}
            />
          ) : (
            <div className="space-y-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
              {allDogs.map((dog) => (
                <DogCard key={dog.id} dog={dog} onNavigate={handleNavigateDog} />
              ))}
            </div>
          )
        )}
        {pagination && pagination.totalPages > 1 && viewMode === 'owners' && (
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={setPage}
          />
        )}
      </div>
    </div>
  )
}

export default Customers
