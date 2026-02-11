import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon'
import { useNavigate, useParams } from 'react-router-dom';
import { format, isFuture, isToday, parseISO } from 'date-fns';
import liffClient from '../api/client';
import { getAvatarUrl } from '../../utils/image';
import { getAxiosErrorMessage } from '../../utils/error';
import { useToast } from '../../components/Toast'
import type { LiffReservationForm } from '../../types/reservation';
import type { LiffDog } from '../types/dog';

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

const INITIAL_FORM: LiffReservationForm = {
  reservation_date: '',
  reservation_time: '',
  pickup_time: '',
  notes: '',
};

function canShowPreVisitInput(reservation: Reservation): boolean {
  if (reservation.status === 'キャンセル' || reservation.status === '降園済') {
    return false;
  }
  const reservationDate = parseISO(reservation.reservation_date);
  return isToday(reservationDate) || isFuture(reservationDate);
}

export default function ReservationEdit(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast()
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [dogs, setDogs] = useState<LiffDog[]>([]);
  const [form, setForm] = useState<LiffReservationForm>(INITIAL_FORM);

  async function fetchData(): Promise<void> {
    try {
      const reservationRes = await liffClient.get(`/reservations/${id}`);
      const resData = reservationRes.data;
      setReservation(resData);
      setForm({
        reservation_date: resData.reservation_date ? resData.reservation_date.split('T')[0] : '',
        reservation_time: resData.reservation_time || '09:00',
        pickup_time: resData.pickup_time || '17:00',
        notes: resData.notes || '',
      });

      const meRes = await liffClient.get('/me');
      setDogs(meRes.data.dogs || []);
    } catch {
      showToast('データの取得に失敗しました', 'error');
      navigate('/home/reservations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(function() {
    fetchData();
  }, [id]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.reservation_date) {
      showToast('予約日を選択してください', 'warning');
      return;
    }

    setSaving(true);
    try {
      await liffClient.put(`/reservations/${id}`, form);
      navigate('/home/reservations');
    } catch (error) {
      showToast(getAxiosErrorMessage(error, '予約の更新に失敗しました'), 'error');
    } finally {
      setSaving(false);
    }
  }

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

  if (!reservation) {
    return <></>;
  }

  const selectedDog = dogs.find(d => d.id === reservation.dog_id);

  return (
    <div className="pb-6">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2 safe-area-pt">
        <button
          onClick={function() { navigate('/home/reservations'); }}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted active:scale-95 transition-all"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
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
                  src={getAvatarUrl(selectedDog.photo_url)}
                  alt={selectedDog.name}
                  loading="lazy"
                  className="size-16 rounded-full object-cover border-2 border-primary/20"
                />
              ) : (
                <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <Icon icon="solar:paw-print-bold" width="32" height="32" className="text-primary" />
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
            <Icon icon="solar:calendar-bold" width="16" height="16" className="text-primary" />
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
                onChange={function(e) { setForm(function(prev) { return { ...prev, reservation_date: e.target.value }; }); }}
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
                  onChange={function(e) { setForm(function(prev) { return { ...prev, reservation_time: e.target.value }; }); }}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">お迎え時間</label>
                <input
                  type="time"
                  value={form.pickup_time}
                  onChange={function(e) { setForm(function(prev) { return { ...prev, pickup_time: e.target.value }; }); }}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 備考 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <Icon icon="solar:notes-bold" width="16" height="16" className="text-primary" />
            備考・連絡事項
          </h3>
          <textarea
            value={form.notes}
            onChange={function(e) { setForm(function(prev) { return { ...prev, notes: e.target.value }; }); }}
            placeholder="特記事項があれば入力してください"
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
          />
        </section>

        {canShowPreVisitInput(reservation) && (
          <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
              <Icon icon="solar:clipboard-text-bold" width="16" height="16" className="text-chart-3" />
              登園前の情報入力
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              当日の朝の様子や健康状態を事前に共有できます
            </p>
            <button
              type="button"
              onClick={function() { navigate(`/home/pre-visit/${reservation.id}`); }}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                reservation.has_pre_visit_input
                  ? 'bg-chart-2/10 text-chart-2 border border-chart-2/20 hover:bg-chart-2/20'
                  : 'bg-chart-3/10 text-chart-3 border border-chart-3/20 hover:bg-chart-3/20'
              }`}
            >
              {reservation.has_pre_visit_input ? (
                <>
                  <Icon icon="solar:check-circle-bold" width="20" height="20" />
                  入力済み（タップして編集）
                </>
              ) : (
                <>
                  <Icon icon="solar:pen-new-square-bold" width="20" height="20" />
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
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Icon icon="solar:check-circle-bold" width="20" height="20" />
                変更を保存
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
