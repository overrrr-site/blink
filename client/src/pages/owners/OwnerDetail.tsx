import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import useSWR, { useSWRConfig } from 'swr'
import { fetcher } from '../../lib/swr'
import type { RecordType } from '../../types/record'
import { getBusinessTypeColors, getBusinessTypeLabel } from '../../domain/businessTypeConfig'
import { LazyImage } from '../../components/LazyImage'
import { getDetailThumbnailUrl } from '../../utils/image'
import { useTrialStore } from '../../store/trialStore'
import { useToast } from '../../components/Toast'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import ConfirmDialog from '../../components/ConfirmDialog'
import api from '../../api/client'

interface OwnerDog {
  id: number
  name: string
  breed: string
  photo_url?: string
}

interface OwnerDetailData {
  id: number
  store_id: number
  name: string
  name_kana?: string
  phone: string
  email?: string
  address?: string
  line_id?: string | null
  business_types?: RecordType[] | null
  dogs: OwnerDog[]
}

function buildOwnerLineLinkUrl(params: {
  phone?: string
  ownerId?: number
  storeId?: number
}): string {
  const searchParams = new URLSearchParams()
  if (params.phone) {
    searchParams.set('phone', params.phone.replace(/[^0-9]/g, ''))
  }
  if (params.ownerId) {
    searchParams.set('ownerId', String(params.ownerId))
  }
  if (params.storeId) {
    searchParams.set('storeId', String(params.storeId))
  }
  const query = searchParams.toString()
  const suffix = query ? `?${query}` : ''
  const liffId = import.meta.env.VITE_LIFF_ID
  if (liffId) {
    return `https://liff.line.me/${liffId}/link${suffix}`
  }
  return `${window.location.origin}/liff/link${suffix}`
}

interface LineLinkCandidate {
  line_user_id: string
  display_name: string | null
  picture_url: string | null
  linked_owner_id: number | null
  linked_owner_name: string | null
}

function OwnerDetail(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { mutate } = useSWRConfig()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()
  const { isTrial } = useTrialStore()
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [candidates, setCandidates] = useState<LineLinkCandidate[] | null>(null)
  const [candidatesLoading, setCandidatesLoading] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const { data: owner, isLoading } = useSWR<OwnerDetailData>(
    id ? `/owners/${id}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const openLinkModal = async () => {
    if (!id) return
    setShowLinkModal(true)
    setCandidatesLoading(true)
    try {
      const res = await api.get<{ candidates: LineLinkCandidate[] }>(`/owners/${id}/line-candidates`)
      setCandidates(res.data.candidates)
    } catch {
      showToast('LINE連携候補の取得に失敗しました', 'error')
      setCandidates([])
    } finally {
      setCandidatesLoading(false)
    }
  }

  const handleLink = async (candidate: LineLinkCandidate) => {
    if (!id || !owner) return
    if (candidate.linked_owner_id && candidate.linked_owner_id !== owner.id) {
      const ok = await confirm({
        title: 'LINE連携を切り替えますか？',
        message: `このLINEアカウントは現在「${candidate.linked_owner_name ?? '別の飼い主さん'}」に紐付いています。「${owner.name}」さんへ切り替えますか？`,
        confirmLabel: '切り替える',
        variant: 'destructive',
      })
      if (!ok) return
    }
    setLinkingId(candidate.line_user_id)
    try {
      await api.post(`/owners/${id}/link-line`, { line_user_id: candidate.line_user_id })
      showToast('LINE連携を更新しました', 'success')
      setShowLinkModal(false)
      await mutate(`/owners/${id}`)
    } catch {
      showToast('LINE連携の更新に失敗しました', 'error')
    } finally {
      setLinkingId(null)
    }
  }

  const handleUnlink = async () => {
    if (!id || !owner) return
    const ok = await confirm({
      title: 'LINE連携を解除しますか？',
      message: `「${owner.name}」さんのLINE連携を解除します。解除すると日誌などの通知が届かなくなります。`,
      confirmLabel: '解除する',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await api.delete(`/owners/${id}/line-link`)
      showToast('LINE連携を解除しました', 'success')
      await mutate(`/owners/${id}`)
    } catch {
      showToast('LINE連携の解除に失敗しました', 'error')
    }
  }

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
  const ownerLineLinkUrl = buildOwnerLineLinkUrl({
    phone: owner.phone,
    ownerId: owner.id,
    storeId: owner.store_id,
  })

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
                <div className="flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold border border-chart-2/30 bg-chart-2/10 text-chart-2">
                    LINE連携済
                  </span>
                  <div className="flex gap-2">
                    {isTrial && (
                      <button
                        type="button"
                        onClick={openLinkModal}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
                      >
                        <Icon icon="solar:refresh-bold" width="14" height="14" />
                        連携を変更
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleUnlink}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 active:scale-[0.98] transition-all"
                    >
                      <Icon icon="solar:link-broken-bold" width="14" height="14" />
                      解除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold border border-border bg-muted text-muted-foreground">
                    未連携
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {isTrial
                      ? '友だち追加済みのLINEアカウントからこの飼い主さんに紐付けます。'
                      : '飼い主さんにLIFFを開いて電話番号で紐付けていただく必要があります。'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {isTrial && (
                      <button
                        type="button"
                        onClick={openLinkModal}
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 active:scale-[0.98] transition-all"
                      >
                        <Icon icon="mdi:line" width="14" height="14" />
                        LINEアカウントから選ぶ
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => window.open(ownerLineLinkUrl, '_blank', 'noopener,noreferrer')}
                      className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                    >
                      <Icon icon="solar:link-bold" width="14" height="14" />
                      連携ページを開く
                    </button>
                  </div>
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

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowLinkModal(false)}>
          <div
            className="bg-card rounded-2xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-base font-bold">LINEアカウントを紐付け</h3>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="size-10 flex items-center justify-center rounded-full hover:bg-muted active:scale-95 transition-all"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-circle-bold" className="size-5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                店舗のLINE公式アカウントを友だち追加し、店舗コードで接続済みのLINEアカウント一覧です。この飼い主さんに紐付けたいアカウントを選んでください。
              </p>
              {candidatesLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">読み込み中...</div>
              ) : candidates && candidates.length > 0 ? (
                candidates.map((c) => {
                  const isCurrent = c.linked_owner_id === owner.id
                  const isOtherLinked = c.linked_owner_id !== null && c.linked_owner_id !== owner.id
                  return (
                    <button
                      key={c.line_user_id}
                      type="button"
                      disabled={isCurrent || linkingId === c.line_user_id}
                      onClick={() => handleLink(c)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                        isCurrent
                          ? 'border-chart-2/40 bg-chart-2/5 cursor-default'
                          : 'border-border bg-card hover:bg-muted active:scale-[0.99]'
                      }`}
                    >
                      {c.picture_url ? (
                        <LazyImage src={c.picture_url} alt={c.display_name ?? 'LINEユーザー'} className="size-10 rounded-full shrink-0" />
                      ) : (
                        <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Icon icon="mdi:line" className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {c.display_name ?? '（表示名取得不可）'}
                        </p>
                        {isCurrent ? (
                          <p className="text-xs text-chart-2 font-medium">このアカウントに紐付け中</p>
                        ) : isOtherLinked ? (
                          <p className="text-xs text-amber-600 font-medium">「{c.linked_owner_name}」さんに紐付け中</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">未紐付け</p>
                        )}
                      </div>
                      {linkingId === c.line_user_id ? (
                        <Icon icon="solar:spinner-bold" className="size-5 text-primary animate-spin" />
                      ) : !isCurrent ? (
                        <Icon icon="solar:arrow-right-linear" className="size-5 text-muted-foreground" />
                      ) : null}
                    </button>
                  )
                })
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Icon icon="mdi:line" className="size-10 mx-auto mb-2 text-muted-foreground/50" />
                  <p>接続済みのLINEアカウントがありません。</p>
                  <p className="mt-1 text-xs">飼い主さんに店舗のLINE公式アカウントを友だち追加し、店舗コードを送信してもらってください。</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  )
}

export default OwnerDetail
