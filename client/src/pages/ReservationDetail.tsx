import { useCallback } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import useSWR from 'swr'
import api from '../api/client'
import { fetcher } from '../lib/swr'
import { getStatusLabel } from '../domain/businessTypeConfig'
import type { RecordType } from '../types/record'
import type { DaycarePreVisitData } from '../types/daycarePreVisit'
import { DAYCARE_LABELS } from '../types/daycarePreVisit'
import {
  getServiceTypeRenderFlags,
  hasReservationPreVisitInput,
  normalizeReservationServiceType,
} from './dashboard/reservationDetailModel'
import { LazyImage } from '../components/LazyImage'
import { getDetailThumbnailUrl } from '../utils/image'

interface ReservationDetailData {
  id: number
  dog_id: number
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
  daycare_data?: DaycarePreVisitData | null
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
            onClick={() => navigate(-1)}
            className="bg-muted text-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-muted/80 transition-colors"
          >
            戻る
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

  const serviceType = normalizeReservationServiceType(reservation.service_type)
  const serviceTypeRenderFlags = getServiceTypeRenderFlags(serviceType)
  const createRecordLabel = serviceType === 'daycare' ? '連絡帳を作成する' : 'カルテを作成する'
  const statusLabel = getStatusLabel(serviceType as RecordType, reservation.status || '予定')
  const hasPreVisitInput = hasReservationPreVisitInput(reservation)

  return (
    <div className="space-y-4 pb-6">
      <div className="hidden print:block print:mb-4 print:border-b print:border-border print:pb-4 px-5">
        <h1 className="text-xl font-bold">事前入力</h1>
        <p className="text-sm text-muted-foreground">
          {reservation.dog_name} / {new Date(reservation.reservation_date).toLocaleDateString('ja-JP')}
        </p>
      </div>
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between safe-area-pt">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </button>
          <h1 className="text-lg font-bold font-heading">事前入力</h1>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-muted text-muted-foreground px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] print:hidden"
        >
          <Icon icon="solar:printer-bold" width="18" height="18" />
          印刷
        </button>
      </header>

      <main className="px-5 space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        {/* Left column: reservation overview */}
        <div className="space-y-4">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              {reservation.dog_photo ? (
                <LazyImage
                  src={getDetailThumbnailUrl(reservation.dog_photo)}
                  alt={reservation.dog_name}
                  className="size-20 rounded-full"
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
              {serviceTypeRenderFlags.showHotel && reservation.end_datetime && (
                <div>
                  <label className="text-xs text-muted-foreground">チェックアウト予定</label>
                  <p className="text-base font-medium">
                    {new Date(reservation.end_datetime).toLocaleDateString('ja-JP')}{' '}
                    {new Date(reservation.end_datetime).toTimeString().slice(0, 5)}
                  </p>
                </div>
              )}
              {serviceTypeRenderFlags.showHotel && (
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
          </div>

          {/* カルテ作成ボタン */}
          <button
            onClick={() => navigate(`/records/create/${reservation.id}`)}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            {createRecordLabel}
          </button>
        </div>

        {/* Right column: pre-visit data */}
        <div className="space-y-4">
          {hasPreVisitInput && (
            <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
              <h3 className="text-lg font-bold mb-4">事前入力</h3>
              {serviceTypeRenderFlags.showDaycare && reservation.daycare_data && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">お迎え予定</label>
                    <p className="text-base font-medium">
                      {DAYCARE_LABELS.pickup_time[reservation.daycare_data.pickup_time] ?? reservation.daycare_data.pickup_time_other ?? '未設定'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">健康状態</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className={`text-xs px-2 py-1 rounded ${reservation.daycare_data.energy === 'poor' ? 'bg-destructive/10 text-destructive' : 'bg-chart-2/10 text-chart-2'}`}>
                        元気: {DAYCARE_LABELS.energy[reservation.daycare_data.energy]}
                        {reservation.daycare_data.energy === 'poor' && reservation.daycare_data.energy_detail && ` (${reservation.daycare_data.energy_detail})`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${reservation.daycare_data.appetite === 'poor' ? 'bg-destructive/10 text-destructive' : 'bg-chart-2/10 text-chart-2'}`}>
                        食欲: {DAYCARE_LABELS.appetite[reservation.daycare_data.appetite]}
                        {reservation.daycare_data.appetite === 'poor' && reservation.daycare_data.appetite_detail && ` (${reservation.daycare_data.appetite_detail})`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${reservation.daycare_data.poop !== 'normal' ? 'bg-destructive/10 text-destructive' : 'bg-chart-2/10 text-chart-2'}`}>
                        うんち: {DAYCARE_LABELS.poop[reservation.daycare_data.poop]}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${reservation.daycare_data.pee !== 'normal' ? 'bg-destructive/10 text-destructive' : 'bg-chart-2/10 text-chart-2'}`}>
                        おしっこ: {DAYCARE_LABELS.pee[reservation.daycare_data.pee]}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${reservation.daycare_data.vomiting ? 'bg-destructive/10 text-destructive' : 'bg-chart-2/10 text-chart-2'}`}>
                        嘔吐: {reservation.daycare_data.vomiting ? 'あり' : 'なし'}
                        {reservation.daycare_data.vomiting && reservation.daycare_data.vomiting_detail && ` (${reservation.daycare_data.vomiting_detail})`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${reservation.daycare_data.itching ? 'bg-destructive/10 text-destructive' : 'bg-chart-2/10 text-chart-2'}`}>
                        かゆみ: {reservation.daycare_data.itching ? 'あり' : 'なし'}
                        {reservation.daycare_data.itching && reservation.daycare_data.itching_detail && ` (${reservation.daycare_data.itching_detail})`}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded bg-chart-2/10 text-chart-2`}>
                        お薬: {reservation.daycare_data.medication ? 'あり' : 'なし'}
                        {reservation.daycare_data.medication && reservation.daycare_data.medication_detail && ` (${reservation.daycare_data.medication_detail})`}
                      </span>
                    </div>
                  </div>
                  {(reservation.daycare_data.last_poop_time || reservation.daycare_data.last_pee_time || reservation.daycare_data.last_meal_time) && (
                    <div>
                      <label className="text-xs text-muted-foreground">最後の排泄・食事</label>
                      <div className="text-sm mt-1 space-y-0.5">
                        {reservation.daycare_data.last_poop_time && <p>うんち: {reservation.daycare_data.last_poop_time.replace(':', '時')}分頃</p>}
                        {reservation.daycare_data.last_pee_time && <p>おしっこ: {reservation.daycare_data.last_pee_time.replace(':', '時')}分頃</p>}
                        {reservation.daycare_data.last_meal_time && <p>ごはん: {reservation.daycare_data.last_meal_time.replace(':', '時')}分頃</p>}
                      </div>
                    </div>
                  )}
                  {reservation.daycare_data.notes && (
                    <div>
                      <label className="text-xs text-muted-foreground">コメント</label>
                      <p className="text-base font-medium whitespace-pre-wrap">{reservation.daycare_data.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {serviceTypeRenderFlags.showGrooming && (
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

              {serviceTypeRenderFlags.showHotel && (
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
        </div>
      </main>
    </div>
  )
}

export default ReservationDetail
