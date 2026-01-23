import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const DogsList = () => {
  const [dogs, setDogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchDogs()
  }, [search])

  const fetchDogs = async () => {
    try {
      const response = await api.get('/dogs', {
        params: { search },
      })
      setDogs(response.data)
    } catch (error) {
      console.error('Error fetching dogs:', error)
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
      <header className="px-5 pt-6 pb-4 bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold font-heading text-foreground">犬一覧</h1>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <iconify-icon
              icon="solar:magnifer-linear"
              className="size-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"
            ></iconify-icon>
            <input
              type="text"
              placeholder="犬名・飼い主名で検索"
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
            <p>犬が見つかりません</p>
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
                    <iconify-icon
                      icon="solar:paw-print-bold"
                      className="size-8 text-muted-foreground"
                    ></iconify-icon>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-base">{dog.name}</h3>
                  <p className="text-sm text-muted-foreground">{dog.breed}</p>
                  <p className="text-xs text-muted-foreground">飼い主: {dog.owner_name}</p>
                </div>
                <iconify-icon
                  icon="solar:alt-arrow-right-linear"
                  className="size-5 text-muted-foreground"
                ></iconify-icon>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}

export default DogsList
