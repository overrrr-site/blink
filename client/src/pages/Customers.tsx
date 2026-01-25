import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import { SkeletonList } from '../components/Skeleton'
import EmptyState from '../components/EmptyState'

interface Owner {
  id: number
  name: string
  name_kana: string
  phone: string
  dogs: Dog[]
}

interface Dog {
  id: number
  name: string
  breed: string
  photo_url?: string
}

const Customers = () => {
  const navigate = useNavigate()
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'owners' | 'dogs'>('owners')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/owners')
      setOwners(response.data)
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  // 検索フィルタリング
  const filteredOwners = owners.filter((owner) => {
    const query = searchQuery.toLowerCase()
    const matchOwner =
      owner.name.toLowerCase().includes(query) ||
      owner.name_kana?.toLowerCase().includes(query) ||
      owner.phone.includes(query)
    const matchDog = owner.dogs?.some(
      (dog) =>
        dog.name.toLowerCase().includes(query) ||
        dog.breed.toLowerCase().includes(query)
    )
    return matchOwner || matchDog
  })

  // 犬一覧用のフラット化されたリスト
  const allDogs = owners.flatMap((owner) =>
    (owner.dogs || []).map((dog) => ({
      ...dog,
      owner_id: owner.id,
      owner_name: owner.name,
    }))
  )

  const filteredDogs = allDogs.filter((dog) => {
    const query = searchQuery.toLowerCase()
    return (
      dog.name.toLowerCase().includes(query) ||
      dog.breed.toLowerCase().includes(query) ||
      dog.owner_name.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="pb-6">
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
          <h1 className="text-lg font-bold font-heading">顧客管理</h1>
        </header>
        <div className="px-5 pt-4">
          <div className="h-12 bg-muted rounded-xl mb-4 animate-pulse" />
          <SkeletonList count={5} type="card" />
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold font-heading">顧客管理</h1>
      </header>

      <div className="px-5 pt-4 space-y-4">
        {/* 検索バー */}
        <div className="relative">
          <iconify-icon
            icon="solar:magnifer-linear"
            class="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground"
          ></iconify-icon>
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
              <iconify-icon icon="solar:close-circle-bold" className="size-5"></iconify-icon>
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
            <iconify-icon icon="solar:user-bold" className="mr-1.5"></iconify-icon>
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
            <iconify-icon icon="solar:paw-print-bold" className="mr-1.5"></iconify-icon>
            ワンちゃん
          </button>
        </div>

        {/* 統計 */}
        <div className="flex gap-3">
          <div className="flex-1 bg-card rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground">飼い主</p>
            <p className="text-2xl font-bold">{owners.length}<span className="text-sm font-normal text-muted-foreground">名</span></p>
          </div>
          <div className="flex-1 bg-card rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground">ワンちゃん</p>
            <p className="text-2xl font-bold">{allDogs.length}<span className="text-sm font-normal text-muted-foreground">頭</span></p>
          </div>
        </div>

        {/* リスト表示 */}
        {viewMode === 'owners' ? (
          // 飼い主一覧
          filteredOwners.length === 0 ? (
            <EmptyState
              icon="solar:users-group-rounded-linear"
              title={searchQuery ? '検索結果がありません' : '飼い主が登録されていません'}
              description={searchQuery ? '検索条件を変更してください' : '新しい飼い主を登録しましょう'}
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
            <div className="space-y-3">
              {filteredOwners.map((owner) => (
                <button
                  key={owner.id}
                  onClick={() => navigate(`/owners/${owner.id}`)}
                  className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left hover:shadow-md transition-shadow active:bg-muted/50 min-h-[72px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {owner.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base">{owner.name}</h3>
                      <p className="text-xs text-muted-foreground">{owner.phone}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {owner.dogs?.slice(0, 3).map((dog) => (
                        <div
                          key={dog.id}
                          className="size-8 rounded-full bg-muted overflow-hidden border-2 border-background -ml-2 first:ml-0"
                        >
                          {dog.photo_url ? (
                            <img
                              src={dog.photo_url}
                              alt={dog.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <iconify-icon
                                icon="solar:paw-print-bold"
                                className="size-4 text-muted-foreground"
                              ></iconify-icon>
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
                    <iconify-icon
                      icon="solar:alt-arrow-right-linear"
                      className="size-6 text-muted-foreground"
                      aria-hidden="true"
                    ></iconify-icon>
                  </div>
                </button>
              ))}
            </div>
          )
        ) : (
          // 犬一覧
          filteredDogs.length === 0 ? (
            <EmptyState
              icon="solar:paw-print-linear"
              title={searchQuery ? '検索結果がありません' : 'ワンちゃんが登録されていません'}
              description={searchQuery ? '検索条件を変更してください' : '飼い主を登録してワンちゃんを追加しましょう'}
            />
          ) : (
            <div className="space-y-3">
              {filteredDogs.map((dog) => (
                <button
                  key={dog.id}
                  onClick={() => navigate(`/dogs/${dog.id}`)}
                  className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left hover:shadow-md transition-shadow active:bg-muted/50 min-h-[72px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="size-12 rounded-full bg-muted overflow-hidden">
                      {dog.photo_url ? (
                        <img
                          src={dog.photo_url}
                          alt={dog.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <iconify-icon
                            icon="solar:paw-print-bold"
                            className="size-6 text-muted-foreground"
                          ></iconify-icon>
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
                    <iconify-icon
                      icon="solar:alt-arrow-right-linear"
                      className="size-6 text-muted-foreground"
                      aria-hidden="true"
                    ></iconify-icon>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default Customers
