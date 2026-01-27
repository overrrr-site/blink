import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import liffClient from '../api/client';
import { format, isToday, isFuture, parseISO } from 'date-fns';

interface Reservation {
  id: number;
  dog_id: number;
  dog_name: string;
  reservation_date: string;
  reservation_time: string;
  pickup_time: string;
  notes: string;
  status: string;
  has_pre_visit_input: boolean;
}

interface Dog {
  id: number;
  name: string;
  photo_url: string;
}

export default function ReservationEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [form, setForm] = useState({
    reservation_date: '',
    reservation_time: '',
    pickup_time: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // 予約情報を取得
      const reservationRes = await liffClient.get(`/reservations/${id}`);
      const resData = reservationRes.data;
      setReservation(resData);
      setForm({
        reservation_date: resData.reservation_date ? resData.reservation_date.split('T')[0] : '',
        reservation_time: resData.reservation_time || '09:00',
        pickup_time: resData.pickup_time || '17:00',
        notes: resData.notes || '',
      });

      // 登録犬一覧を取得
      const meRes = await liffClient.get('/me');
      setDogs(meRes.data.dogs || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('データの取得に失敗しました');
      navigate('/home/reservations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reservation_date) {
      alert('予約日を選択してください');
      return;
    }

    setSaving(true);
    try {
      await liffClient.put(`/reservations/${id}`, form);
      navigate('/home/reservations');
    } catch (error: any) {
      console.error('Error updating reservation:', error);
      alert(error.response?.data?.error || '予約の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

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

  if (!reservation) {
    return null;
  }

  const selectedDog = dogs.find(d => d.id === reservation.dog_id);

  return (
    <div className="pb-6">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate('/home/reservations')}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">予約を変更</h1>
      </header>

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* 選択中の犬 */}
        {selectedDog && (
          <section className="bg-card rounded-2xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              {selectedDog.photo_url ? (
                <img
                  src={selectedDog.photo_url}
                  alt={selectedDog.name}
                  className="size-16 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <iconify-icon icon="solar:paw-print-bold" width="32" height="32" class="text-primary"></iconify-icon>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground mb-1">予約するワンちゃん</p>
                <p className="text-base font-bold">{selectedDog.name}</p>
              </div>
            </div>
          </section>
        )}

        {/* 予約日時 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <iconify-icon icon="solar:calendar-bold" width="16" height="16" class="text-primary"></iconify-icon>
            予約日時
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                予約日 <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                value={form.reservation_date}
                onChange={(e) => setForm(prev => ({ ...prev, reservation_date: e.target.value }))}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">登園時間</label>
                <input
                  type="time"
                  value={form.reservation_time}
                  onChange={(e) => setForm(prev => ({ ...prev, reservation_time: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">お迎え時間</label>
                <input
                  type="time"
                  value={form.pickup_time}
                  onChange={(e) => setForm(prev => ({ ...prev, pickup_time: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 備考 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <iconify-icon icon="solar:notes-bold" width="16" height="16" class="text-primary"></iconify-icon>
            備考・連絡事項
          </h3>
          <textarea
            value={form.notes}
            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="特記事項があれば入力してください"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </section>

        {/* 登園前入力（今日または未来の予約で、キャンセル以外の場合） */}
        {reservation.status !== 'キャンセル' &&
         reservation.status !== '退園済' &&
         (isToday(parseISO(reservation.reservation_date)) || isFuture(parseISO(reservation.reservation_date))) && (
          <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
              <iconify-icon icon="solar:clipboard-text-bold" width="16" height="16" class="text-chart-3"></iconify-icon>
              登園前の情報入力
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              当日の朝の様子や健康状態を事前に共有できます
            </p>
            <button
              type="button"
              onClick={() => navigate(`/home/pre-visit/${reservation.id}`)}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                reservation.has_pre_visit_input
                  ? 'bg-chart-2/10 text-chart-2 border border-chart-2/20 hover:bg-chart-2/20'
                  : 'bg-chart-3/10 text-chart-3 border border-chart-3/20 hover:bg-chart-3/20'
              }`}
            >
              {reservation.has_pre_visit_input ? (
                <>
                  <iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
                  入力済み（タップして編集）
                </>
              ) : (
                <>
                  <iconify-icon icon="solar:pen-new-square-bold" width="20" height="20"></iconify-icon>
                  登園前情報を入力する
                </>
              )}
            </button>
          </section>
        )}

        {/* 保存ボタン */}
        <div className="pt-4 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="animate-spin"></iconify-icon>
                保存中...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
                変更を保存
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
