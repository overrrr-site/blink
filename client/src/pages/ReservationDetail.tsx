import { useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import useSWR from 'swr'
import api from '../api/client'
import { fetcher } from '../lib/swr'
import { getDashboardStatusLabels, getStatusLabel } from '../domain/businessTypeConfig'
import type { RecordType } from '../types/record'

interface ReservationDetailData {
  id: number
  dog_name: string
  dog_photo?: string | null
  owner_name: string
  reservation_date: string
  reservation_time?: string | null
  end_datetime?: string | null
  status?: string | null
  service_type?: 'daycare' | 'grooming' | 'hotel'
  room_name?: string | null
  room_size?: string | null
  morning_urination?: boolean
  morning_defecation?: boolean
  afternoon_urination?: boolean
  afternoon_defecation?: boolean
  breakfast_status?: string | null
  health_status?: string | null
  pre_visit_notes?: string | null
  meal_data?: Array<{ time: string; food_name: string; amount: string }> | null
  pre_visit_service_type?: string | null
  grooming_data?: GroomingPreVisitData | null
  hotel_data?: HotelPreVisitData | null
}

interface GroomingPreVisitData {
  counseling?: {
    style_request?: string
    caution_notes?: string
    condition_notes?: string
    consent_confirmed?: boolean
  }
  pre_visit?: {
    pickup_time?: string
    completion_contact?: 'line' | 'phone' | 'none'
    day_of_notes?: string
  }
}

interface HotelPreVisitData {
  feeding_schedule?: {
    morning?: string
    evening?: string
    snack?: string
  }
  medication?: {
    has_medication?: boolean
    details?: string
  }
  walk_preference?: string
  sleeping_habit?: string
  special_notes?: string
  emergency_contact_confirmed?: boolean
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { error?: string } | undefined)?.error
    return message || '予約の取得に失敗しました'
  }
  return '予約の取得に失敗しました'
}

const ReservationDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: reservation, error, isLoading, mutate } = useSWR<ReservationDetailData>(
    id ? `/reservations/${id}` : null,
    fetcher,
    { revalidateOnFocus: true }
  )

  const updateStatus = useCallback(async (status: string) => {
    if (!id) return
    try {
      await api.put(`/reservations/${id}`, { status })
      mutate()
    } catch {
    }
  }, [id, mutate])

  const handleRetry = useCallback(() => {
    mutate()
  }, [mutate])

  const handlePrint = useCallback(() => {
    if (!id) return
    api.post('/exports/log', {
      export_type: 'reservations',
      output_format: 'print',
      filters: { reservation_id: Number(id) },
    }).catch(() => undefined)
    window.print()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error || !reservation) {
    const errorMessage = error ? getErrorMessage(error) : '予約が見つかりません'
    return (
      <div className="flex flex-col items-center justify-center h-full px-5">
        <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Icon icon="solar:danger-triangle-bold" className="size-10 text-destructive" />
        </div>
        <h3 className="text-lg font-bold mb-2">{errorMessage}</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          {error ? '予約情報の取得に失敗しました。もう一度お試しください。' : '指定された予約は存在しないか、削除された可能性があります。'}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/reservations')}
            className="bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors"
          >
            予約一覧に戻る
          </button>
          {error && (
            <button
              onClick={handleRetry}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              再読み込み
            </button>
          )}
        </div>
      </div>
    )
  }

  const serviceType = reservation.service_type || 'daycare'
  const createRecordLabel = serviceType === 'daycare' ? '連絡帳を作成する' : 'カルテを作成する'
  const statusLabels = getDashboardStatusLabels(serviceType as RecordType)
  const statusLabel = getStatusLabel(serviceType as RecordType, reservation.status || '予定')
  const hasPreVisitInput = Boolean(
    reservation.grooming_data ||
      reservation.hotel_data ||
      reservation.pre_visit_notes ||
      reservation.breakfast_status ||
      reservation.health_status ||
      (reservation.meal_data && reservation.meal_data.length > 0) ||
      reservation.morning_urination !== null && reservation.morning_urination !== undefined ||
      reservation.morning_defecation !== null && reservation.morning_defecation !== undefined ||
      reservation.afternoon_urination !== null && reservation.afternoon_urination !== undefined ||
      reservation.afternoon_defecation !== null && reservation.afternoon_defecation !== undefined
  )

  return (
    <div className="space-y-4 pb-6">
      <div className="hidden print:block print:mb-4 print:border-b print:border-border print:pb-4 px-5">
        <h1 className="text-xl font-bold">予約詳細</h1>
        <p className="text-sm text-muted-foreground">
          {reservation.dog_name} / {new Date(reservation.reservation_date).toLocaleDateString('ja-JP')}
        </p>
      </div>
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between safe-area-pt">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reservations')} className="p-2 -ml-2 text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </button>
          <h1 className="text-lg font-bold font-heading">予約詳細</h1>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] print:hidden"
        >
          <Icon icon="solar:printer-bold" width="18" height="18" />
          印刷
        </button>
      </header>

      <main className="px-5 space-y-4">
        <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            {reservation.dog_photo ? (
              <img
                src={reservation.dog_photo}
                alt={reservation.dog_name}
                className="size-20 rounded-full object-cover"
              />
            ) : (
              <div className="size-20 rounded-full bg-muted flex items-center justify-center">
                <Icon icon="solar:paw-print-bold"
                  className="size-10 text-muted-foreground" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold mb-1">{reservation.dog_name}</h2>
              <p className="text-sm text-muted-foreground">{reservation.owner_name} 様</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">予約日時</label>
              <p className="text-base font-medium">
                {new Date(reservation.reservation_date).toLocaleDateString('ja-JP')}{' '}
                {reservation.reservation_time?.substring(0, 5)}
              </p>
            </div>
            {reservation.service_type === 'hotel' && reservation.end_datetime && (
              <div>
                <label className="text-xs text-muted-foreground">チェックアウト予定</label>
                <p className="text-base font-medium">
                  {new Date(reservation.end_datetime).toLocaleDateString('ja-JP')}{' '}
                  {new Date(reservation.end_datetime).toTimeString().slice(0, 5)}
                </p>
              </div>
            )}
            {reservation.service_type === 'hotel' && (
              <div>
                <label className="text-xs text-muted-foreground">割当部屋</label>
                <p className="text-base font-medium">
                  {reservation.room_name
                    ? `${reservation.room_name}${reservation.room_size ? ` (${reservation.room_size})` : ''}`
                    : '未設定'}
                </p>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground">ステータス</label>
              <p className="text-base font-medium">{statusLabel}</p>
            </div>
          </div>

          {/* ステータスに応じたアクションボタン */}
          <div className="mt-4 space-y-2">
            {reservation.status === '予定' && (
              <button
                onClick={() => updateStatus('登園済')}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="solar:login-3-bold" className="size-5" />
                {statusLabels.checkIn}
              </button>
            )}
            {reservation.status === '登園済' && (
              <button
                onClick={() => updateStatus('降園済')}
                className="w-full bg-chart-3 text-white py-3 rounded-xl text-sm font-bold hover:bg-chart-3/90 transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="solar:logout-3-bold" className="size-5" />
                {statusLabels.checkOut}
              </button>
            )}
            {(reservation.status === '登園済' || reservation.status === '降園済') && (
              <button
                onClick={() => updateStatus('予定')}
                className="w-full bg-muted text-foreground py-2 rounded-xl text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                ステータスを戻す
              </button>
            )}
          </div>
        </div>

        {hasPreVisitInput && (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4">事前入力</h3>
            {serviceType === 'daycare' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">排泄（前日夜〜当日朝）</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {reservation.morning_urination && (
                      <span className="text-xs bg-chart-2/10 text-chart-2 px-2 py-1 rounded">
                        朝オシッコ
                      </span>
                    )}
                    {reservation.morning_defecation && (
                      <span className="text-xs bg-chart-2/10 text-chart-2 px-2 py-1 rounded">
                        朝ウンチ
                      </span>
                    )}
                    {reservation.afternoon_urination && (
                      <span className="text-xs bg-chart-2/10 text-chart-2 px-2 py-1 rounded">
                        昨夜オシッコ
                      </span>
                    )}
                    {reservation.afternoon_defecation && (
                      <span className="text-xs bg-chart-2/10 text-chart-2 px-2 py-1 rounded">
                        昨夜ウンチ
                      </span>
                    )}
                    {!reservation.morning_urination && !reservation.morning_defecation &&
                     !reservation.afternoon_urination && !reservation.afternoon_defecation && (
                      <span className="text-xs text-muted-foreground">なし</span>
                    )}
                  </div>
                </div>
                {reservation.breakfast_status && (
                  <div>
                    <label className="text-xs text-muted-foreground">朝ごはんの食べ具合</label>
                    <p className="text-base font-medium">{reservation.breakfast_status}</p>
                  </div>
                )}
                {reservation.meal_data && reservation.meal_data.length > 0 && (
                  <div>
                    <label className="text-xs text-muted-foreground">ごはん記録</label>
                    <div className="mt-1 space-y-1">
                      {reservation.meal_data.map((meal, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          {meal.time && <span className="text-muted-foreground">{meal.time}</span>}
                          <span className="font-medium">{meal.food_name}</span>
                          {meal.amount && <span className="text-muted-foreground">{meal.amount}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {reservation.health_status && (
                  <div>
                    <label className="text-xs text-muted-foreground">体調の変化</label>
                    <p className="text-base font-medium">{reservation.health_status}</p>
                  </div>
                )}
                {reservation.pre_visit_notes && (
                  <div>
                    <label className="text-xs text-muted-foreground">連絡事項</label>
                    <p className="text-base font-medium">{reservation.pre_visit_notes}</p>
                  </div>
                )}
              </div>
            )}

            {serviceType === 'grooming' && (
              <div className="space-y-3">
                {reservation.grooming_data?.counseling?.style_request && (
                  <div>
                    <label className="text-xs text-muted-foreground">希望スタイル</label>
                    <p className="text-base font-medium whitespace-pre-wrap">{reservation.grooming_data.counseling.style_request}</p>
                  </div>
                )}
                {reservation.grooming_data?.counseling?.caution_notes && (
                  <div>
                    <label className="text-xs text-muted-foreground">注意事項</label>
                    <p className="text-base font-medium whitespace-pre-wrap">{reservation.grooming_data.counseling.caution_notes}</p>
                  </div>
                )}
                {reservation.grooming_data?.counseling?.condition_notes && (
                  <div>
                    <label className="text-xs text-muted-foreground">当日の体調・変化</label>
                    <p className="text-base font-medium whitespace-pre-wrap">{reservation.grooming_data.counseling.condition_notes}</p>
                  </div>
                )}
                {reservation.grooming_data?.pre_visit?.pickup_time && (
                  <div>
                    <label className="text-xs text-muted-foreground">お迎え予定時刻</label>
                    <p className="text-base font-medium">{reservation.grooming_data.pre_visit.pickup_time}</p>
                  </div>
                )}
                {reservation.grooming_data?.pre_visit?.completion_contact && (
                  <div>
                    <label className="text-xs text-muted-foreground">仕上がり連絡の希望</label>
                    <p className="text-base font-medium">
                      {reservation.grooming_data.pre_visit.completion_contact === 'line'
                        ? 'LINEで連絡'
                        : reservation.grooming_data.pre_visit.completion_contact === 'phone'
                          ? '電話で連絡'
                          : '連絡不要'}
                    </p>
                  </div>
                )}
                {reservation.grooming_data?.pre_visit?.day_of_notes && (
                  <div>
                    <label className="text-xs text-muted-foreground">当日メモ</label>
                    <p className="text-base font-medium whitespace-pre-wrap">{reservation.grooming_data.pre_visit.day_of_notes}</p>
                  </div>
                )}
                {reservation.grooming_data?.counseling?.consent_confirmed && (
                  <div>
                    <label className="text-xs text-muted-foreground">確認状況</label>
                    <p className="text-base font-medium">内容確認済み</p>
                  </div>
                )}
              </div>
            )}

            {serviceType === 'hotel' && (
              <div className="space-y-3">
                {(reservation.hotel_data?.feeding_schedule?.morning ||
                  reservation.hotel_data?.feeding_schedule?.evening ||
                  reservation.hotel_data?.feeding_schedule?.snack) && (
                  <div>
                    <label className="text-xs text-muted-foreground">食事について</label>
                    <div className="mt-1 space-y-1 text-sm">
                      {reservation.hotel_data?.feeding_schedule?.morning && (
                        <p>朝: {reservation.hotel_data.feeding_schedule.morning}</p>
                      )}
                      {reservation.hotel_data?.feeding_schedule?.evening && (
                        <p>夜: {reservation.hotel_data.feeding_schedule.evening}</p>
                      )}
                      {reservation.hotel_data?.feeding_schedule?.snack && (
                        <p>おやつ: {reservation.hotel_data.feeding_schedule.snack}</p>
                      )}
                    </div>
                  </div>
                )}
                {reservation.hotel_data?.medication?.has_medication !== undefined && (
                  <div>
                    <label className="text-xs text-muted-foreground">投薬</label>
                    <p className="text-base font-medium">
                      {reservation.hotel_data.medication?.has_medication ? 'あり' : 'なし'}
                    </p>
                    {reservation.hotel_data.medication?.details && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-1">
                        {reservation.hotel_data.medication.details}
                      </p>
                    )}
                  </div>
                )}
                {reservation.hotel_data?.walk_preference && (
                  <div>
                    <label className="text-xs text-muted-foreground">お散歩の希望</label>
                    <p className="text-base font-medium">{reservation.hotel_data.walk_preference}</p>
                  </div>
                )}
                {reservation.hotel_data?.sleeping_habit && (
                  <div>
                    <label className="text-xs text-muted-foreground">寝る時の習慣</label>
                    <p className="text-base font-medium">{reservation.hotel_data.sleeping_habit}</p>
                  </div>
                )}
                {reservation.hotel_data?.special_notes && (
                  <div>
                    <label className="text-xs text-muted-foreground">特記事項</label>
                    <p className="text-base font-medium whitespace-pre-wrap">{reservation.hotel_data.special_notes}</p>
                  </div>
                )}
                {reservation.hotel_data?.emergency_contact_confirmed !== undefined && (
                  <div>
                    <label className="text-xs text-muted-foreground">緊急連絡先</label>
                    <p className="text-base font-medium">
                      {reservation.hotel_data.emergency_contact_confirmed ? '確認済み' : '未確認'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate(`/records/create/${reservation.id}`)}
          className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
        >
          {createRecordLabel}
        </button>
      </main>
    </div>
  )
}

export default ReservationDetail
