import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import type { RecordType } from '../types/record'
import { getBusinessTypeColors, getBusinessTypeLabel } from '../utils/businessTypeColors'
import { LazyImage } from '../components/LazyImage'
import { getDetailThumbnailUrl } from '../utils/image'

interface OwnerDog {
  id: number
  name: string
  breed: string
  photo_url?: string
}

interface OwnerDetailData {
  id: number
  name: string
  name_kana?: string
  phone: string
  email?: string
  address?: string
  line_id?: string | null
  business_types?: RecordType[] | null
  dogs: OwnerDog[]
}

function buildOwnerLineLinkUrl(phone?: string): string {
  const phoneQuery = phone ? `?phone=${encodeURIComponent(phone.replace(/[^0-9]/g, ''))}` : ''
  const liffId = import.meta.env.VITE_LIFF_ID
  if (liffId) {
    return `https://liff.line.me/${liffId}/link${phoneQuery}`
  }
  return `${window.location.origin}/liff/link${phoneQuery}`
}

function OwnerDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: owner, isLoading } = useSWR<OwnerDetailData>(
    id ? `/owners/${id}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  if (isLoading) {
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

  const isLineLinked = Boolean(owner.line_id && owner.line_id.trim())
  const ownerLineLinkUrl = buildOwnerLineLinkUrl(owner.phone)

  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="飼い主詳細"
        backPath="/customers"
        rightContent={
          <button
            onClick={() => navigate(`/owners/${id}/edit`)}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -mr-3 text-primary rounded-full active:bg-primary/10 transition-colors"
            aria-label="編集"
          >
            <Icon icon="solar:pen-bold" width="22" height="22" />
          </button>
        }
      />

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
                <Icon icon="solar:phone-calling-bold" className="size-4" />
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
                  <Icon icon="solar:letter-bold" className="size-4" />
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
            <div>
              <label className="text-xs text-muted-foreground block mb-1">LINE連携</label>
              {isLineLinked ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border border-chart-2/30 bg-chart-2/10 text-chart-2">
                  LINE連携済
                </span>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold border border-border bg-muted text-muted-foreground">
                    未連携
                  </span>
                  <button
                    type="button"
                    onClick={() => window.open(ownerLineLinkUrl, '_blank', 'noopener,noreferrer')}
                    className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
                  >
                    <Icon icon="solar:link-bold" width="14" height="14" />
                    連携ページを開く
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">利用サービス</label>
              {Array.isArray(owner.business_types) && owner.business_types.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {owner.business_types.map((type) => {
                    const colors = getBusinessTypeColors(type)
                    return (
                      <span
                        key={type}
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          background: colors.pale,
                          color: colors.primary,
                          border: `1px solid ${colors.primary}33`,
                        }}
                      >
                        {getBusinessTypeLabel(type)}
                      </span>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">未設定</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">登録ワンちゃん</h2>
            <button
              onClick={() => navigate(`/owners/${id}/dogs/new`)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors"
            >
              <Icon icon="solar:add-circle-bold" width="20" height="20" />
              ワンちゃんを追加
            </button>
          </div>
          {owner.dogs && owner.dogs.length > 0 ? (
            owner.dogs.length === 1 ? (
              <div
                onClick={() => navigate(`/dogs/${owner.dogs[0].id}`)}
                className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors"
              >
                {owner.dogs[0].photo_url ? (
                  <LazyImage
                    src={getDetailThumbnailUrl(owner.dogs[0].photo_url)}
                    alt={owner.dogs[0].name}
                    className="size-20 rounded-full shrink-0"
                  />
                ) : (
                  <div className="size-20 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Icon icon="solar:paw-print-bold"
                      className="size-10 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{owner.dogs[0].name}</h3>
                  <p className="text-sm text-muted-foreground">{owner.dogs[0].breed}</p>
                </div>
                <Icon icon="solar:alt-arrow-right-linear"
                  className="size-5 text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto pb-2 -mx-2 px-2">
                <div className="flex gap-3">
                  {owner.dogs.map((dog) => (
                    <div
                      key={dog.id}
                      onClick={() => navigate(`/dogs/${dog.id}`)}
                      className="flex flex-col items-center gap-2 p-3 bg-muted/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors shrink-0 min-w-[100px] min-h-[120px]"
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dogs/${dog.id}`)}
                    >
                      {dog.photo_url ? (
                        <LazyImage
                          src={getDetailThumbnailUrl(dog.photo_url)}
                          alt={dog.name}
                          className="size-16 rounded-full"
                        />
                      ) : (
                        <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                          <Icon icon="solar:paw-print-bold"
                            className="size-8 text-muted-foreground" />
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
            )
          ) : (
            <div className="text-center py-8">
              <Icon icon="solar:paw-print-bold"
                className="size-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">登録されているワンちゃんがいません</p>
              <button
                onClick={() => navigate(`/owners/${id}/dogs/new`)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors"
              >
                <Icon icon="solar:add-circle-bold" width="20" height="20" />
                ワンちゃんを追加
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default OwnerDetail
