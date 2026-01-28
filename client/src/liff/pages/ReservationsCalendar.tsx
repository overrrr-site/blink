import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isFuture,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ja } from 'date-fns/locale';
import liffClient from '../api/client';
import { getAvatarUrl } from '../../utils/image';

interface Reservation {
  id: number;
  reservation_date: string;
  reservation_time: string;
  dog_name: string;
  dog_photo: string;
  status: string;
  has_pre_visit_input: boolean;
  morning_urination: boolean | null;
  morning_defecation: boolean | null;
  afternoon_urination: boolean | null;
  afternoon_defecation: boolean | null;
  breakfast_status: string | null;
  health_status: string | null;
  pre_visit_notes: string | null;
}

const SWIPE_THRESHOLD = 50;

function getReservationsForDate(reservations: Reservation[], date: Date): Reservation[] {
  return reservations.filter(function(r) {
    return isSameDay(parseISO(r.reservation_date), date);
  });
}

function hasNoExcretionRecords(reservation: Reservation): boolean {
  return !reservation.morning_urination &&
         !reservation.morning_defecation &&
         !reservation.afternoon_urination &&
         !reservation.afternoon_defecation;
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'キャンセル':
      return 'bg-destructive/10 text-destructive';
    case '確定':
      return 'bg-chart-2/10 text-chart-2';
    default:
      return 'bg-primary/10 text-primary';
  }
}

export default function ReservationsCalendar(): JSX.Element {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handlePrevMonth(): void {
    setCurrentMonth(subMonths(currentMonth, 1));
  }

  function handleNextMonth(): void {
    setCurrentMonth(addMonths(currentMonth, 1));
  }

  function handleTouchStart(e: React.TouchEvent): void {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent): void {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > SWIPE_THRESHOLD) {
      if (diff > 0) {
        handleNextMonth();
      } else {
        handlePrevMonth();
      }
    }
    touchStartX.current = null;
  }

  async function fetchReservations(): Promise<void> {
    try {
      const monthStr = format(currentMonth, 'yyyy-MM');
      const response = await liffClient.get('/reservations', {
        params: { month: monthStr },
      });
      setReservations(response.data);
    } catch (error) {
      console.error('Error fetching reservations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelReservation(reservationId: number): Promise<void> {
    if (!confirm('この予約をキャンセルしますか？')) return;

    try {
      await liffClient.put(`/reservations/${reservationId}/cancel`);
      const monthStr = format(currentMonth, 'yyyy-MM');
      const response = await liffClient.get('/reservations', {
        params: { month: monthStr },
      });
      setReservations(response.data);
    } catch (error) {
      console.error('Error canceling reservation:', error);
      alert('予約のキャンセルに失敗しました');
    }
  }

  useEffect(function() {
    fetchReservations();
  }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const selectedReservations = selectedDate ? getReservationsForDate(reservations, selectedDate) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold"
          width="48"
          height="48"
          className="text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-28">
      {/* ヘッダー（戻るボタン付き） */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">予約カレンダー</h1>
        <button
          onClick={function() {
            const monthStr = format(currentMonth, 'yyyy-MM');
            const token = localStorage.getItem('liff_token');
            const url = `${import.meta.env.VITE_API_URL}/liff/reservations/export.ics?month=${monthStr}`;

            // tokenをAuthorizationヘッダーで送信するためにfetchを使用
            fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            })
              .then(function(response) { return response.blob(); })
              .then(function(blob) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = `reservations-${monthStr}.ics`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              })
              .catch(function(error) {
                console.error('ICS export error:', error);
                alert('カレンダーのエクスポートに失敗しました');
              });
          }}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center text-primary rounded-full active:bg-primary/10 transition-colors"
          aria-label="カレンダーをエクスポート"
          title="iCS形式でエクスポート"
        >
          <Icon icon="solar:download-bold" width="24" height="24" />
        </button>
      </div>

      {/* 月切り替え */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-xl transition-colors active:scale-95"
          aria-label="前月"
        >
          <Icon icon="solar:alt-arrow-left-bold" width="24" height="24" />
        </button>
        <h2 className="text-lg font-bold font-heading">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-xl transition-colors active:scale-95"
          aria-label="次月"
        >
          <Icon icon="solar:alt-arrow-right-bold" width="24" height="24" />
        </button>
      </div>

      {/* カレンダー */}
      <div 
        ref={containerRef}
        className="bg-card rounded-3xl p-4 border border-border shadow-sm mb-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['日', '月', '火', '水', '木', '金', '土'].map(function(day, idx) {
            let colorClass = 'text-muted-foreground';
            if (idx === 0) colorClass = 'text-destructive';
            if (idx === 6) colorClass = 'text-chart-3';
            return (
              <span key={day} className={`text-xs font-bold py-2 ${colorClass}`}>
                {day}
              </span>
            );
          })}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {days.map(function(day) {
            const dayReservations = getReservationsForDate(reservations, day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isTodayDate = isSameDay(day, new Date());
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const hasReservation = dayReservations.length > 0;

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square rounded-xl p-1 flex flex-col items-center justify-center transition-all min-w-[40px] min-h-[40px]
                  active:scale-95 ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : hasReservation
                      ? 'bg-primary/15 hover:bg-primary/25'
                      : isTodayDate
                      ? 'bg-accent/50 ring-2 ring-primary/30'
                      : isCurrentMonth
                      ? 'hover:bg-muted'
                      : 'text-muted-foreground/40 hover:bg-muted/50'
                  }`}
                aria-label={`${format(day, 'M月d日')}${hasReservation ? `、${dayReservations.length}件の予約あり` : ''}`}
                aria-pressed={!!isSelected}
              >
                <span className={`text-sm ${isSelected || isTodayDate ? 'font-bold' : ''}`}>
                  {format(day, 'd')}
                </span>
                {hasReservation && (
                  <div className={`w-2 h-2 rounded-full mt-0.5 ${
                    isSelected ? 'bg-white' : 'bg-primary'
                  }`}></div>
                )}
              </button>
            );
          })}
        </div>

        {/* 凡例 */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary"></div>
            <span className="text-xs text-muted-foreground">予約あり</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full ring-2 ring-primary/30 bg-accent/50"></div>
            <span className="text-xs text-muted-foreground">今日</span>
          </div>
        </div>

        {/* スワイプヒント */}
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          ← 左右にスワイプで月を移動 →
        </p>
      </div>

      {/* 選択日の予約一覧 */}
      <div className="space-y-3">
        <h2 className="text-base font-bold font-heading flex items-center gap-2">
          <Icon icon="solar:calendar-bold" width="20" height="20" className="text-primary" />
          {selectedDate ? format(selectedDate, 'M月d日 (E)', { locale: ja }) : '日付を選択してください'}
        </h2>
        
        {selectedDate && selectedReservations.length > 0 ? (
          <div className="space-y-3">
            {selectedReservations.map((reservation) => (
              <div
                key={reservation.id}
                className="bg-card rounded-2xl p-4 border border-border shadow-sm"
              >
                <div className="flex items-center gap-3 mb-3">
                  {reservation.dog_photo ? (
                    <img
                      src={getAvatarUrl(reservation.dog_photo)}
                      alt={reservation.dog_name}
                      loading="lazy"
                      className="size-14 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <Icon icon="solar:paw-print-bold" width="28" height="28" className="text-primary" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{reservation.dog_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Icon icon="solar:clock-circle-linear" width="16" height="16" />
                      {reservation.reservation_time}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-bold ${getStatusBadgeClass(reservation.status)}`}>
                    {reservation.status}
                  </span>
                </div>
                {/* 登園前入力情報（入力済みの場合のみ表示） */}
                {reservation.has_pre_visit_input && (
                  <div className="pt-3 border-t border-border">
                    <div className="bg-chart-3/5 rounded-xl p-3 space-y-2">
                      <h4 className="text-xs font-bold text-chart-3 flex items-center gap-1">
                        <Icon icon="solar:clipboard-text-bold" width="14" height="14" />
                        登園前入力
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* 排泄情報 */}
                        <div className="space-y-1">
                          <span className="text-muted-foreground">排泄</span>
                          <div className="flex flex-wrap gap-1">
                            {reservation.morning_urination && (
                              <span className="bg-chart-2/10 text-chart-2 px-1.5 py-0.5 rounded text-[10px]">
                                朝オシッコ
                              </span>
                            )}
                            {reservation.morning_defecation && (
                              <span className="bg-chart-2/10 text-chart-2 px-1.5 py-0.5 rounded text-[10px]">
                                朝ウンチ
                              </span>
                            )}
                            {reservation.afternoon_urination && (
                              <span className="bg-chart-2/10 text-chart-2 px-1.5 py-0.5 rounded text-[10px]">
                                昨夜オシッコ
                              </span>
                            )}
                            {reservation.afternoon_defecation && (
                              <span className="bg-chart-2/10 text-chart-2 px-1.5 py-0.5 rounded text-[10px]">
                                昨夜ウンチ
                              </span>
                            )}
                            {hasNoExcretionRecords(reservation) && (
                              <span className="text-muted-foreground text-[10px]">なし</span>
                            )}
                          </div>
                        </div>
                        {/* 食事 */}
                        {reservation.breakfast_status && (
                          <div className="space-y-1">
                            <span className="text-muted-foreground">朝ごはん</span>
                            <p className="font-medium">{reservation.breakfast_status}</p>
                          </div>
                        )}
                      </div>
                      {/* 体調・連絡事項 */}
                      {(reservation.health_status || reservation.pre_visit_notes) && (
                        <div className="text-xs space-y-1 pt-1 border-t border-chart-3/10">
                          {reservation.health_status && (
                            <div>
                              <span className="text-muted-foreground">体調: </span>
                              <span>{reservation.health_status}</span>
                            </div>
                          )}
                          {reservation.pre_visit_notes && (
                            <div>
                              <span className="text-muted-foreground">連絡: </span>
                              <span>{reservation.pre_visit_notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {reservation.status !== 'キャンセル' && reservation.status !== '降園済' && reservation.status !== '登園済' && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-border">
                    {/* 登園前入力ボタン（今日または未来の予約の場合） */}
                    {(isToday(parseISO(reservation.reservation_date)) || isFuture(parseISO(reservation.reservation_date))) && (
                      <button
                        onClick={() => navigate(`/home/pre-visit/${reservation.id}`)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                          reservation.has_pre_visit_input
                            ? 'border border-chart-2/30 bg-chart-2/5 text-chart-2 active:bg-chart-2/10'
                            : 'border border-chart-3/30 bg-chart-3/5 text-chart-3 active:bg-chart-3/10'
                        }`}
                      >
                        <Icon icon={reservation.has_pre_visit_input ? "solar:check-circle-bold" : "solar:clipboard-text-bold"} width="18" height="18" />
                        {reservation.has_pre_visit_input ? '登園前入力を編集' : '登園前情報を入力'}
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/home/reservations/${reservation.id}/edit`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-bold active:bg-primary/10 transition-colors"
                      >
                        <Icon icon="solar:pen-bold" width="18" height="18" />
                        変更
                      </button>
                      {/* キャンセルボタンは予約前日まで（予約日より前の日のみ）表示 */}
                      {isFuture(parseISO(reservation.reservation_date)) && (
                        <button
                          onClick={function() { handleCancelReservation(reservation.id); }}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm font-bold active:bg-destructive/10 transition-colors"
                        >
                          <Icon icon="solar:trash-bin-trash-bold" width="18" height="18" />
                          キャンセル
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : selectedDate ? (
          <div className="bg-muted/30 rounded-2xl p-8 border border-border text-center">
            <Icon icon="solar:calendar-minimalistic-linear" width="48" height="48" className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-3">この日の予約はありません</p>
            <button
              onClick={() => navigate('/home/reservations/new')}
              className="text-primary text-sm font-bold hover:underline"
            >
              予約を作成する →
            </button>
          </div>
        ) : null}
      </div>

      {/* 新規予約ボタン */}
      <button
        onClick={() => navigate('/home/reservations/new')}
        className="fixed bottom-24 right-5 bg-primary text-primary-foreground size-14 rounded-full shadow-lg 
                   flex items-center justify-center z-20 active:scale-95 transition-transform
                   hover:shadow-xl hover:bg-primary/90"
        aria-label="新規予約を作成"
      >
        <Icon icon="solar:add-circle-bold" width="32" height="32" />
      </button>
    </div>
  );
}
