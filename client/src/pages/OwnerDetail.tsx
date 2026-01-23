import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

const OwnerDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [owner, setOwner] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchOwner()
    }
  }, [id])

  const fetchOwner = async () => {
    try {
      const response = await api.get(`/owners/${id}`)
      setOwner(response.data)
    } catch (error) {
      console.error('Error fetching owner:', error)
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

  if (!owner) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">飼い主が見つかりません</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
          </button>
          <h1 className="text-lg font-bold font-heading">飼い主詳細</h1>
        </div>
        <button
          onClick={() => navigate(`/owners/${id}/edit`)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -mr-3 text-primary rounded-full active:bg-primary/10 transition-colors"
          aria-label="編集"
        >
          <iconify-icon icon="solar:pen-bold" width="22" height="22"></iconify-icon>
        </button>
      </header>

      <main className="px-5 space-y-4">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <h2 className="text-xl font-bold mb-4">基本情報</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">氏名</label>
              <p className="text-base font-medium">{owner.name}</p>
            </div>
            {owner.name_kana && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">フリガナ</label>
                <p className="text-base font-medium">{owner.name_kana}</p>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground block mb-1">電話番号</label>
              <a 
                href={`tel:${owner.phone}`} 
                className="text-base font-medium text-primary flex items-center gap-2 hover:underline"
              >
                <iconify-icon icon="solar:phone-calling-bold" className="size-4"></iconify-icon>
                {owner.phone}
              </a>
            </div>
            {owner.email && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">メールアドレス</label>
                <a 
                  href={`mailto:${owner.email}`} 
                  className="text-base font-medium text-primary flex items-center gap-2 hover:underline"
                >
                  <iconify-icon icon="solar:letter-bold" className="size-4"></iconify-icon>
                  {owner.email}
                </a>
              </div>
            )}
            {owner.address && (
              <div>
                <label className="text-xs text-muted-foreground block mb-1">住所</label>
                <p className="text-sm font-medium leading-relaxed">{owner.address}</p>
              </div>
            )}
          </div>
        </div>

        {owner.dogs && owner.dogs.length > 0 && (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h2 className="text-xl font-bold mb-4">登録犬</h2>
            {owner.dogs.length === 1 ? (
              <div
                onClick={() => navigate(`/dogs/${owner.dogs[0].id}`)}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {owner.dogs[0].photo_url ? (
                  <img
                    src={owner.dogs[0].photo_url}
                    alt={owner.dogs[0].name}
                    className="size-20 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="size-20 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <iconify-icon
                      icon="solar:paw-print-bold"
                      className="size-10 text-muted-foreground"
                    ></iconify-icon>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{owner.dogs[0].name}</h3>
                  <p className="text-sm text-muted-foreground">{owner.dogs[0].breed}</p>
                </div>
                <iconify-icon
                  icon="solar:alt-arrow-right-linear"
                  className="size-5 text-muted-foreground"
                ></iconify-icon>
              </div>
            ) : (
              <div className="overflow-x-auto pb-2 -mx-2 px-2">
                <div className="flex gap-3">
                  {owner.dogs.map((dog: any) => (
                    <div
                      key={dog.id}
                      onClick={() => navigate(`/dogs/${dog.id}`)}
                      className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors shrink-0 min-w-[100px]"
                    >
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
                      <div className="text-center">
                        <h3 className="font-bold text-sm">{dog.name}</h3>
                        <p className="text-xs text-muted-foreground">{dog.breed}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default OwnerDetail
