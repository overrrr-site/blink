import { useEffect, useState } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

const ReservationDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [reservation, setReservation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchReservation()
    }
  }, [id])

  const fetchReservation = async () => {
    try {
      setError(null)
      const response = await api.get(`/reservations/${id}`)
      setReservation(response.data)
    } catch (error: any) {
      console.error('Error fetching reservation:', error)
      setError(error.response?.data?.error || '予約の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: string) => {
    try {
      await api.put(`/reservations/${id}`, { status })
      fetchReservation()
    } catch (error) {
      console.error('Error updating reservation:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (error || !reservation) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-5">
        <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Icon icon="solar:danger-triangle-bold" className="size-10 text-destructive" />
        </div>
        <h3 className="text-lg font-bold mb-2">{error || '予約が見つかりません'}</h3>
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
              onClick={fetchReservation}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
            >
              再読み込み
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/reservations')} className="p-2 -ml-2 text-foreground">
            <Icon icon="solar:arrow-left-linear" className="size-6" />
          </button>
          <h1 className="text-lg font-bold font-heading">予約詳細</h1>
        </div>
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
            <div>
              <label className="text-xs text-muted-foreground">ステータス</label>
              <p className="text-base font-medium">{reservation.status || '予定'}</p>
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
                登園
              </button>
            )}
            {reservation.status === '登園済' && (
              <button
                onClick={() => updateStatus('降園済')}
                className="w-full bg-chart-3 text-white py-3 rounded-xl text-sm font-bold hover:bg-chart-3/90 transition-colors flex items-center justify-center gap-2"
              >
                <Icon icon="solar:logout-3-bold" className="size-5" />
                降園
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

        {reservation.morning_urination !== undefined && (
          <div className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <h3 className="text-lg font-bold mb-4">登園前入力</h3>
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
          </div>
        )}

        <button
          onClick={() => navigate(`/journals/create/${id}`)}
          className="w-full bg-chart-3 text-white py-3 rounded-xl text-sm font-bold hover:bg-chart-3/90 transition-colors"
        >
          日誌を作成する
        </button>
      </main>
    </div>
  )
}

export default ReservationDetail
