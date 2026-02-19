import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import axios from 'axios'
import { Icon } from '../../../components/Icon'
import { useToast } from '../../../components/Toast'
import { useConfirmDialog } from '../../../hooks/useConfirmDialog'
import ConfirmDialog from '../../../components/ConfirmDialog'
import api from '../../../api/client'
import { fetcher } from '../../../lib/swr'
import { shallowEqualRecord } from './helpers'

interface StoreSettings {
  hotel_checkin_time?: string
  hotel_checkout_time?: string
}

interface HotelRoomItem {
  id: number
  room_name: string
  room_size: '小型' | '中型' | '大型'
  capacity: number
  enabled: boolean
  display_order: number
}

interface HotelRoomSectionProps {
  isHotelEnabled: boolean
  canEdit: boolean
}

export default function HotelRoomSection({ isHotelEnabled, canEdit }: HotelRoomSectionProps): JSX.Element | null {
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()

  const [localHotelRooms, setLocalHotelRooms] = useState<HotelRoomItem[]>([])
  const [newRoom, setNewRoom] = useState({
    room_name: '',
    room_size: '小型' as '小型' | '中型' | '大型',
    capacity: 1,
    display_order: 0,
  })

  const [storeSettings, setStoreSettings] = useState<Required<StoreSettings>>({
    hotel_checkin_time: '10:00',
    hotel_checkout_time: '18:00',
  })
  const previousSettingsRef = useRef<Required<StoreSettings>>({
    hotel_checkin_time: '10:00',
    hotel_checkout_time: '18:00',
  })

  const { data: storeSettingsData } = useSWR<StoreSettings>(isHotelEnabled ? '/store-settings' : null, fetcher)
  const {
    data: hotelRooms,
    isLoading,
    mutate,
  } = useSWR<HotelRoomItem[]>(isHotelEnabled ? '/hotel-rooms' : null, fetcher)

  useEffect(() => {
    if (!storeSettingsData) return
    const normalizedSettings = {
      hotel_checkin_time: storeSettingsData.hotel_checkin_time || '10:00',
      hotel_checkout_time: storeSettingsData.hotel_checkout_time || '18:00',
    }
    setStoreSettings(normalizedSettings)
    previousSettingsRef.current = normalizedSettings
  }, [storeSettingsData])

  useEffect(() => {
    if (!isHotelEnabled) return
    setLocalHotelRooms(hotelRooms ?? [])
  }, [hotelRooms, isHotelEnabled])

  const settingsPayload = useMemo(() => ({
    hotel_checkin_time: storeSettings.hotel_checkin_time,
    hotel_checkout_time: storeSettings.hotel_checkout_time,
  }), [storeSettings])

  useEffect(() => {
    if (!storeSettingsData) return
    if (shallowEqualRecord(settingsPayload, previousSettingsRef.current)) return

    const timer = setTimeout(async () => {
      try {
        await api.put('/store-settings', settingsPayload)
        previousSettingsRef.current = settingsPayload
      } catch (error: unknown) {
        const message = axios.isAxiosError(error)
          ? (error.response?.data as { error?: string } | undefined)?.error
          : null
        showToast(message || '設定の保存に失敗しました', 'error')
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [settingsPayload, showToast, storeSettingsData])

  async function handleCreateRoom(): Promise<void> {
    if (!newRoom.room_name.trim()) {
      showToast('部屋名を入力してください', 'error')
      return
    }

    try {
      await api.post('/hotel-rooms', {
        room_name: newRoom.room_name.trim(),
        room_size: newRoom.room_size,
        capacity: newRoom.capacity,
        display_order: newRoom.display_order,
      })
      setNewRoom({ room_name: '', room_size: '小型', capacity: 1, display_order: 0 })
      await mutate()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || '部屋の追加に失敗しました', 'error')
    }
  }

  async function handleSaveRoom(room: HotelRoomItem): Promise<void> {
    try {
      await api.put(`/hotel-rooms/${room.id}`, {
        room_name: room.room_name,
        room_size: room.room_size,
        capacity: room.capacity,
        enabled: room.enabled,
        display_order: room.display_order,
      })
      await mutate()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || '部屋の更新に失敗しました', 'error')
    }
  }

  async function handleDeleteRoom(roomId: number): Promise<void> {
    const ok = await confirm({
      title: '削除確認',
      message: 'この部屋を削除しますか？',
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'destructive',
    })
    if (!ok) return

    try {
      await api.delete(`/hotel-rooms/${roomId}`)
      await mutate()
    } catch (error: unknown) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: string } | undefined)?.error
        : null
      showToast(message || '部屋の削除に失敗しました', 'error')
    }
  }

  if (!isHotelEnabled) {
    return null
  }

  return (
    <>
      <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:sleeping-square-bold" width="16" height="16" className="text-chart-5" />
            ホテル設定
          </h2>
        </div>

        <div className="w-full flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-muted-foreground" />
            <div className="text-left flex-1">
              <span className="text-sm font-medium block">チェックイン時間</span>
              <span className="text-[10px] text-muted-foreground">デフォルトの受付開始時間</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={storeSettings.hotel_checkin_time}
              onChange={(e) => {
                setStoreSettings((prev) => ({ ...prev, hotel_checkin_time: e.target.value }))
              }}
              className="px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
            />
          </div>
        </div>

        <div className="w-full flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-muted-foreground" />
            <div className="text-left flex-1">
              <span className="text-sm font-medium block">チェックアウト時間</span>
              <span className="text-[10px] text-muted-foreground">デフォルトのお迎え時間</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={storeSettings.hotel_checkout_time}
              onChange={(e) => {
                setStoreSettings((prev) => ({ ...prev, hotel_checkout_time: e.target.value }))
              }}
              className="px-3 py-2 rounded-lg border border-border bg-input text-sm font-bold text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[44px]"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <Icon icon="solar:home-2-bold" width="16" height="16" className="text-chart-5" />
            部屋マスタ
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            部屋名（例: A-1 / ケージS1）、サイズ、定員（通常1）、表示順、有効/無効を設定します。
          </p>

          {isLoading ? (
            <div className="text-center py-4">
              <span className="text-xs text-muted-foreground">読み込み中...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {localHotelRooms.map((room) => (
                <div key={room.id} className="p-3 bg-muted/30 rounded-xl space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">部屋名</label>
                      <input
                        type="text"
                        value={room.room_name}
                        disabled={!canEdit}
                        onChange={(e) => {
                          setLocalHotelRooms((prev) => prev.map((item) => (
                            item.id === room.id ? { ...item, room_name: e.target.value } : item
                          )))
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                        placeholder="部屋名"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">サイズ</label>
                      <select
                        value={room.room_size}
                        disabled={!canEdit}
                        onChange={(e) => {
                          const nextSize = e.target.value as '小型' | '中型' | '大型'
                          setLocalHotelRooms((prev) => prev.map((item) => (
                            item.id === room.id ? { ...item, room_size: nextSize } : item
                          )))
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                      >
                        <option value="小型">小型</option>
                        <option value="中型">中型</option>
                        <option value="大型">大型</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">定員</label>
                      <input
                        type="number"
                        value={room.capacity}
                        min={1}
                        disabled={!canEdit}
                        onChange={(e) => {
                          setLocalHotelRooms((prev) => prev.map((item) => (
                            item.id === room.id
                              ? { ...item, capacity: Math.max(1, Number.parseInt(e.target.value, 10) || 1) }
                              : item
                          )))
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">表示順</label>
                      <input
                        type="number"
                        value={room.display_order}
                        disabled={!canEdit}
                        onChange={(e) => {
                          setLocalHotelRooms((prev) => prev.map((item) => (
                            item.id === room.id
                              ? { ...item, display_order: Number.parseInt(e.target.value, 10) || 0 }
                              : item
                          )))
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">予約受付</label>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]">
                        <input
                          type="checkbox"
                          checked={room.enabled}
                          disabled={!canEdit}
                          onChange={(e) => {
                            setLocalHotelRooms((prev) => prev.map((item) => (
                              item.id === room.id ? { ...item, enabled: e.target.checked } : item
                            )))
                          }}
                        />
                        有効
                      </label>
                    </div>
                  </div>

                  {canEdit && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSaveRoom(room)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] min-h-[48px]"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="px-3 py-2 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all active:scale-[0.98] min-h-[48px]"
                      >
                        削除
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {localHotelRooms.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <Icon icon="solar:home-bold" width="40" height="40" className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">部屋が登録されていません</p>
                </div>
              )}

              {canEdit && (
                <div className="p-3 border border-dashed border-border rounded-xl space-y-2">
                  <p className="text-xs text-muted-foreground">新しい部屋を追加</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">部屋名</label>
                      <input
                        type="text"
                        value={newRoom.room_name}
                        onChange={(e) => setNewRoom((prev) => ({ ...prev, room_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                        placeholder="部屋名"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">サイズ</label>
                      <select
                        value={newRoom.room_size}
                        onChange={(e) => setNewRoom((prev) => ({
                          ...prev,
                          room_size: e.target.value as '小型' | '中型' | '大型',
                        }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                      >
                        <option value="小型">小型</option>
                        <option value="中型">中型</option>
                        <option value="大型">大型</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">定員</label>
                      <input
                        type="number"
                        value={newRoom.capacity}
                        min={1}
                        onChange={(e) => setNewRoom((prev) => ({
                          ...prev,
                          capacity: Math.max(1, Number.parseInt(e.target.value, 10) || 1),
                        }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground">表示順</label>
                      <input
                        type="number"
                        value={newRoom.display_order}
                        onChange={(e) => setNewRoom((prev) => ({
                          ...prev,
                          display_order: Number.parseInt(e.target.value, 10) || 0,
                        }))}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[44px]"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateRoom}
                    className="w-full py-2.5 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-all active:scale-[0.98]"
                  >
                    部屋を追加
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </>
  )
}
