import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

type TabType = 'owners' | 'dogs'

interface OwnerDogSummary {
  id: number
  name: string
  photo_url?: string
}

interface OwnerListItem {
  id: number
  name: string
  created_at: string
  last_reservation_date?: string
  dogs: OwnerDogSummary[]
}

interface DogListItem {
  id: number
  name: string
  breed: string
  photo_url?: string
  owner_name: string
}

const OwnersList = () => {
  const [owners, setOwners] = useState<OwnerListItem[]>([])
  const [dogs, setDogs] = useState<DogListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('owners')
  const navigate = useNavigate()

  useEffect(() => {
    if (activeTab === 'owners') {
      fetchOwners()
    } else {
      fetchDogs()
    }
  }, [search, activeTab])

  const fetchOwners = async () => {
    try {
      const response = await api.get('/owners', {
        params: { search },
      })
      setOwners(response.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const fetchDogs = async () => {
    try {
      setLoading(true)
      const response = await api.get('/dogs', {
        params: { search },
      })
      setDogs(response.data)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10 safe-area-pt">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">顧客管理</h1>
          <button
            onClick={() => navigate('/owners/new')}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Icon icon="solar:user-plus-bold" className="size-4" />
            新規登録
          </button>
        </div>

        {/* タブ切り替え */}
        <div className="flex gap-2 mb-4 bg-muted rounded-xl p-1">
          <button
            onClick={() => setActiveTab('owners')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'owners'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            飼い主
          </button>
          <button
            onClick={() => setActiveTab('dogs')}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'dogs'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            }`}
          >
            ワンちゃん
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Icon icon="solar:magnifer-linear"
              className="size-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {search && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                {activeTab === 'owners' ? '名前・電話番号で検索' : '名前・犬種で検索'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-5 space-y-3">
        {activeTab === 'dogs' ? (
          dogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>ワンちゃんが見つかりません</p>
            </div>
          ) : (
            dogs.map((dog) => (
              <div
                key={dog.id}
                onClick={() => navigate(`/dogs/${dog.id}`)}
                className="bg-card rounded-2xl p-4 border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  {dog.photo_url ? (
                    <img
                      src={dog.photo_url}
                      alt={dog.name}
                      className="size-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                      <Icon icon="solar:paw-print-bold"
                        className="size-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{dog.name}</h3>
                    <p className="text-sm text-muted-foreground">{dog.breed}</p>
                    <p className="text-xs text-muted-foreground">飼い主: {dog.owner_name}</p>
                  </div>
                  <Icon icon="solar:alt-arrow-right-linear"
                    className="size-5 text-muted-foreground" />
                </div>
              </div>
            ))
          )
        ) : owners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>飼い主が見つかりません</p>
          </div>
        ) : (
          owners.map((owner) => (
            <div
              key={owner.id}
              onClick={() => navigate(`/owners/${owner.id}`)}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {owner.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-base">{owner.name}</h3>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-xs text-muted-foreground">
                      登録日: {new Date(owner.created_at).toLocaleDateString('ja-JP')}
                    </p>
                    {owner.last_reservation_date && (
                      <p className="text-xs text-chart-3">
                        最終予約: {new Date(owner.last_reservation_date).toLocaleDateString('ja-JP')}
                      </p>
                    )}
                  </div>
                  {owner.dogs && owner.dogs.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {owner.dogs.map((dog) => (
                        <div
                          key={dog.id}
                          className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1"
                        >
                          {dog.photo_url ? (
                            <img
                              src={dog.photo_url}
                              alt={dog.name}
                              className="size-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="size-6 rounded-full bg-muted flex items-center justify-center">
                              <Icon icon="solar:paw-print-bold"
                                className="size-3 text-muted-foreground" />
                            </div>
                          )}
                          <span className="text-xs font-medium">{dog.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="text-muted-foreground hover:text-primary transition-colors p-1">
                  <Icon icon="solar:alt-arrow-right-linear" className="size-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}

export default OwnersList
