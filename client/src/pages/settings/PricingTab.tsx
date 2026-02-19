import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import useSWR from 'swr'
import api from '../../api/client'
import { fetcher } from '../../lib/swr'
import { useAuthStore, selectUser } from '../../store/authStore'
import { useBusinessTypeStore } from '../../store/businessTypeStore'
import { getAvailableBusinessTypes, isBusinessTypeVisible } from '../../utils/businessTypeAccess'
import { useToast } from '../../components/Toast'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import ConfirmDialog from '../../components/ConfirmDialog'
import type { RecordType } from '../../types/record'

interface CourseMaster {
  id: number
  course_name: string
  contract_type: string
  enabled?: boolean | null
  sessions?: number | null
  price?: number | null
  valid_days?: number | null
}

interface GroomingMenuItem {
  id: number
  menu_name: string
  price?: number
  duration_minutes?: number
  dog_size?: string
}

interface HotelPriceItem {
  id?: number
  dog_size: string
  price_per_night: number
}

function getContractTypeStyle(contractType: string): string {
  switch (contractType) {
    case '月謝制':
      return 'bg-chart-2/10 text-chart-2'
    case 'チケット制':
      return 'bg-chart-4/10 text-chart-4'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

function PricingTab() {
  const navigate = useNavigate()
  const user = useAuthStore(selectUser)
  const { selectedBusinessType } = useBusinessTypeStore()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()

  const storeBusinessTypes = (user?.businessTypes || []) as RecordType[]
  const availableBusinessTypes = getAvailableBusinessTypes({
    storeBusinessTypes,
    assignedBusinessTypes: user?.assignedBusinessTypes,
    isOwner: user?.isOwner,
  })
  const isDaycareEnabled = isBusinessTypeVisible(selectedBusinessType, availableBusinessTypes, 'daycare')
  const isGroomingEnabled = isBusinessTypeVisible(selectedBusinessType, availableBusinessTypes, 'grooming')
  const isHotelEnabled = isBusinessTypeVisible(selectedBusinessType, availableBusinessTypes, 'hotel')

  const { data, isLoading, mutate } = useSWR<CourseMaster[]>(
    '/course-masters',
    fetcher
  )
  const courseList = data ?? []
  const {
    data: groomingMenus,
    isLoading: loadingGroomingMenus,
    mutate: mutateGroomingMenus,
  } = useSWR<GroomingMenuItem[]>(isGroomingEnabled ? '/grooming-menus' : null, fetcher)
  const {
    data: hotelPrices,
    isLoading: loadingHotelPrices,
    mutate: mutateHotelPrices,
  } = useSWR<HotelPriceItem[]>(isHotelEnabled ? '/hotel-prices' : null, fetcher)
  const [localHotelPrices, setLocalHotelPrices] = useState<HotelPriceItem[]>([])

  const resolvedGroomingMenus = groomingMenus ?? []

  useEffect(() => {
    if (!isHotelEnabled) {
      return
    }
    const defaults: HotelPriceItem[] = [
      { dog_size: '小型', price_per_night: 0 },
      { dog_size: '中型', price_per_night: 0 },
      { dog_size: '大型', price_per_night: 0 },
    ]
    const prices = hotelPrices ?? []
    const merged = defaults.map((row) => prices.find((price) => price.dog_size === row.dog_size) || row)
    setLocalHotelPrices(merged)
  }, [hotelPrices, isHotelEnabled])

  const handleDeleteCourse = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await confirm({
      title: '削除確認',
      message: 'このコースを削除しますか？',
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await api.delete(`/course-masters/${id}`)
      mutate()
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(errorMessage || 'コースの削除に失敗しました', 'error')
    }
  }, [mutate, confirm, showToast])

  const handleDeleteGroomingMenu = useCallback(async (id: number, e: React.MouseEvent) => {
    e.stopPropagation()
    const ok = await confirm({
      title: '削除確認',
      message: 'このメニューを削除しますか？',
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await api.delete(`/grooming-menus/${id}`)
      mutateGroomingMenus()
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(errorMessage || 'メニューの削除に失敗しました', 'error')
    }
  }, [mutateGroomingMenus, confirm, showToast])

  const handleSaveHotelPrices = useCallback(async () => {
    try {
      await api.put('/hotel-prices', { prices: localHotelPrices })
      mutateHotelPrices()
      showToast('ホテル料金を保存しました', 'success')
    } catch (error: unknown) {
      const errorMessage = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(errorMessage || 'ホテル料金の保存に失敗しました', 'error')
    }
  }, [localHotelPrices, mutateHotelPrices, showToast])

  return (
    <>
    <div className="space-y-4">
      {isDaycareEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:tag-price-bold" width="16" height="16" className="text-chart-4" />
              幼稚園コース・料金設定
            </h2>
            <button
              onClick={() => navigate('/settings/courses/new')}
              className="text-xs font-bold text-primary flex items-center gap-1 transition-all active:scale-[0.98]"
            >
              <Icon icon="solar:add-circle-bold" width="14" height="14" />
              追加
            </button>
          </div>
          {isLoading ? (
            <div className="text-center py-4">
              <span className="text-xs text-muted-foreground">読み込み中...</span>
            </div>
          ) : courseList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Icon icon="solar:tag-price-bold" width="48" height="48" className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">コースが登録されていません</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {courseList.map((course) => (
                <div
                  key={course.id}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className="flex-1 text-left cursor-pointer"
                    onClick={() => navigate(`/settings/courses/${course.id}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium block">{course.course_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getContractTypeStyle(course.contract_type)}`}>
                        {course.contract_type}
                      </span>
                      {!course.enabled && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                          無効
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {course.sessions && `${course.sessions}回 / `}
                      ¥{Math.floor(course.price ?? 0).toLocaleString()}
                      {course.valid_days && ` / 有効期限${course.valid_days}日`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/settings/courses/${course.id}`)}
                      className="p-2 rounded-full hover:bg-muted transition-all active:scale-95"
                      aria-label={`${course.course_name}の詳細`}
                    >
                      <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCourse(course.id, e)}
                      className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-all active:scale-95"
                      aria-label={`${course.course_name}を削除`}
                    >
                      <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {isGroomingEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:scissors-bold" width="16" height="16" className="text-chart-4" />
              トリミングメニュー・料金
            </h2>
            <button
              onClick={() => navigate('/settings/grooming-menu/new')}
              className="text-xs font-bold text-primary flex items-center gap-1 transition-all active:scale-[0.98]"
            >
              <Icon icon="solar:add-circle-bold" width="14" height="14" />
              追加
            </button>
          </div>
          <div className="p-4">
            {loadingGroomingMenus ? (
              <div className="text-center py-4">
                <span className="text-xs text-muted-foreground">読み込み中...</span>
              </div>
            ) : resolvedGroomingMenus.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-xl">
                <Icon icon="solar:scissors-bold" width="32" height="32" className="mx-auto mb-2 opacity-50" />
                <p className="text-xs">メニューが登録されていません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {resolvedGroomingMenus.map((menu) => (
                  <div
                    key={menu.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{menu.menu_name}</span>
                        {menu.dog_size && menu.dog_size !== '全サイズ' && (
                          <span className="text-[10px] bg-chart-4/10 text-chart-4 px-1.5 py-0.5 rounded font-medium">
                            {menu.dog_size}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {menu.price !== undefined && menu.price !== null && (
                          <span className="text-xs text-muted-foreground">¥{menu.price.toLocaleString()}</span>
                        )}
                        {menu.duration_minutes && (
                          <span className="text-xs text-muted-foreground">{menu.duration_minutes}分</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigate(`/settings/grooming-menu/${menu.id}`)}
                        className="p-2 text-muted-foreground rounded-full hover:bg-muted transition-all active:scale-95"
                        aria-label={`${menu.menu_name}を編集`}
                      >
                        <Icon icon="solar:pen-bold" width="16" height="16" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteGroomingMenu(menu.id, e)}
                        className="p-2 text-destructive rounded-full hover:bg-destructive/10 transition-all active:scale-95"
                        aria-label={`${menu.menu_name}を削除`}
                      >
                        <Icon icon="solar:trash-bin-minimalistic-bold" width="16" height="16" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {isHotelEnabled && (
        <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="text-sm font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:sleeping-square-bold" width="16" height="16" className="text-chart-5" />
              ホテル料金設定
            </h2>
          </div>
          <div className="p-4">
            {loadingHotelPrices ? (
              <div className="text-center py-4">
                <span className="text-xs text-muted-foreground">読み込み中...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {localHotelPrices.map((price, index) => (
                  <div key={price.dog_size} className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl">
                    <span className="text-sm font-medium w-12">{price.dog_size}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">¥</span>
                      <input
                        type="number"
                        value={price.price_per_night}
                        onChange={(e) => {
                          const next = [...localHotelPrices]
                          next[index] = {
                            ...next[index],
                            price_per_night: Number.parseInt(e.target.value, 10) || 0,
                          }
                          setLocalHotelPrices(next)
                        }}
                        min="0"
                        step="100"
                        className="flex-1 px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-right focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
                <button
                  onClick={handleSaveHotelPrices}
                  className="w-full mt-3 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all active:scale-[0.98]"
                >
                  料金を保存
                </button>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
    <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  )
}

export default PricingTab
