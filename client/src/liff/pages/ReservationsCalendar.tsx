import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Reservation {
  id: number;
  reservation_date: string;
  reservation_time: string;
  dog_name: string;
  dog_photo: string;
  status: string;
}

export default function ReservationsCalendar() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const touchStartX = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchReservations = async () => {
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
    };

    fetchReservations();
  }, [currentMonth]);

  // スワイプジェスチャー対応
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        handleNextMonth();
      } else {
        handlePrevMonth();
      }
    }
    touchStartX.current = null;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getReservationsForDate = (date: Date) => {
    return reservations.filter((r) => isSameDay(parseISO(r.reservation_date), date));
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const selectedReservations = selectedDate ? getReservationsForDate(selectedDate) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <iconify-icon
          icon="solar:spinner-bold"
          width="48"
          height="48"
          class="text-primary animate-spin"
        ></iconify-icon>
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
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">予約カレンダー</h1>
      </div>

      {/* 月切り替え */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-xl transition-colors active:scale-95"
          aria-label="前月"
        >
          <iconify-icon icon="solar:alt-arrow-left-bold" width="24" height="24"></iconify-icon>
        </button>
        <h2 className="text-lg font-bold font-heading">
          {format(currentMonth, 'yyyy年M月', { locale: ja })}
        </h2>
        <button
          onClick={handleNextMonth}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-xl transition-colors active:scale-95"
          aria-label="次月"
        >
          <iconify-icon icon="solar:alt-arrow-right-bold" width="24" height="24"></iconify-icon>
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
          {['日', '月', '火', '水', '木', '金', '土'].map((day, idx) => (
            <span
              key={day}
              className={`text-xs font-bold py-2 ${
                idx === 0 ? 'text-destructive' : idx === 6 ? 'text-chart-3' : 'text-muted-foreground'
              }`}
            >
              {day}
            </span>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayReservations = getReservationsForDate(day);
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
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
                      : isToday
                      ? 'bg-accent/50 ring-2 ring-primary/30'
                      : isCurrentMonth
                      ? 'hover:bg-muted'
                      : 'text-muted-foreground/40 hover:bg-muted/50'
                  }`}
                aria-label={`${format(day, 'M月d日')}${hasReservation ? `、${dayReservations.length}件の予約あり` : ''}`}
                aria-pressed={!!isSelected}
              >
                <span className={`text-sm ${isSelected || isToday ? 'font-bold' : ''}`}>
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
          <iconify-icon icon="solar:calendar-bold" width="20" height="20" class="text-primary"></iconify-icon>
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
                      src={reservation.dog_photo}
                      alt={reservation.dog_name}
                      className="size-14 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                      <iconify-icon icon="solar:paw-print-bold" width="28" height="28" class="text-primary"></iconify-icon>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{reservation.dog_name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <iconify-icon icon="solar:clock-circle-linear" width="16" height="16"></iconify-icon>
                      {reservation.reservation_time}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-3 py-1.5 rounded-full font-bold ${
                      reservation.status === 'キャンセル'
                        ? 'bg-destructive/10 text-destructive'
                        : reservation.status === '確定'
                        ? 'bg-chart-2/10 text-chart-2'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {reservation.status}
                  </span>
                </div>
                {reservation.status !== 'キャンセル' && (
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => navigate(`/reservations/${reservation.id}/edit`)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-bold active:bg-primary/10 transition-colors"
                    >
                      <iconify-icon icon="solar:pen-bold" width="18" height="18"></iconify-icon>
                      変更
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm('この予約をキャンセルしますか？')) {
                          try {
                            await liffClient.put(`/reservations/${reservation.id}/cancel`);
                            // 予約一覧を再取得
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
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-sm font-bold active:bg-destructive/10 transition-colors"
                    >
                      <iconify-icon icon="solar:trash-bin-trash-bold" width="18" height="18"></iconify-icon>
                      キャンセル
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : selectedDate ? (
          <div className="bg-muted/30 rounded-2xl p-8 border border-border text-center">
            <iconify-icon icon="solar:calendar-minimalistic-linear" width="48" height="48" class="text-muted-foreground mx-auto mb-3"></iconify-icon>
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
        <iconify-icon icon="solar:add-circle-bold" width="32" height="32"></iconify-icon>
      </button>
    </div>
  );
}
