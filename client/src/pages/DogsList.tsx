import { useState, useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { useDebouncedValue } from '../hooks/useDebouncedValue'

interface Dog {
  id: number
  name: string
  breed: string
  owner_name: string
  photo_url?: string | null
}

const DogsList = () => {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const debouncedSearch = useDebouncedValue(search, 300)
  const listKey = `/dogs?search=${encodeURIComponent(debouncedSearch)}`
  const { data, isLoading } = useSWR<Dog[]>(listKey, fetcher, { revalidateOnFocus: false })
  const dogs = data ?? []

  const handleNavigateDog = useCallback((id: number) => {
    navigate(`/dogs/${id}`)
  }, [navigate])

  if (isLoading) {
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
          <h1 className="text-2xl font-bold font-heading text-foreground">ワンちゃん一覧</h1>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Icon icon="solar:magnifer-linear"
              className="size-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ワンちゃん名・飼い主名で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </header>

      <main className="px-5 space-y-3">
        {dogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>ワンちゃんが見つかりません</p>
          </div>
        ) : (
          dogs.map((dog) => (
            <div
              key={dog.id}
              onClick={() => handleNavigateDog(dog.id)}
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
        )}
      </main>
    </div>
  )
}

export default DogsList
