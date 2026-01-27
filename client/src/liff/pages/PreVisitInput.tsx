import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// チェックボックスコンポーネント
function CheckboxItem({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label 
      htmlFor={id}
      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all min-h-[56px]
                  active:scale-[0.99] ${
                    checked 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border bg-card hover:border-primary/30'
                  }`}
    >
      <div className={`size-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
        checked ? 'bg-primary border-primary' : 'border-muted-foreground/30'
      }`}>
        {checked && (
          <iconify-icon icon="solar:check-linear" width="16" height="16" class="text-white"></iconify-icon>
        )}
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

export default function PreVisitInput() {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reservation, setReservation] = useState<any>(null);
  const [formData, setFormData] = useState({
    morning_urination: false,
    morning_defecation: false,
    afternoon_urination: false,
    afternoon_defecation: false,
    breakfast_status: '',
    health_status: '',
    notes: '',
  });

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await liffClient.get('/reservations');
        const res = response.data.find((r: any) => r.id === parseInt(reservationId || '0'));
        if (res) {
          setReservation(res);
          // 既存の登園前入力データがあればフォームに読み込む
          if (res.has_pre_visit_input) {
            setFormData({
              morning_urination: res.morning_urination ?? false,
              morning_defecation: res.morning_defecation ?? false,
              afternoon_urination: res.afternoon_urination ?? false,
              afternoon_defecation: res.afternoon_defecation ?? false,
              breakfast_status: res.breakfast_status ?? '',
              health_status: res.health_status ?? '',
              notes: res.pre_visit_notes ?? '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching reservation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservation();
  }, [reservationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservationId) return;

    setSaving(true);
    try {
      await liffClient.post('/pre-visit-inputs', {
        reservation_id: parseInt(reservationId),
        ...formData,
      });
      navigate('/home');
    } catch (error: any) {
      console.error('Error saving pre-visit input:', error);
      alert(error.response?.data?.error || '登園前入力の保存に失敗しました');
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
    return (
      <div className="px-5 pt-6 text-center">
        <iconify-icon icon="solar:calendar-cross-bold" width="64" height="64" class="text-muted-foreground mx-auto mb-4"></iconify-icon>
        <p className="text-muted-foreground mb-4">予約が見つかりません</p>
        <button
          onClick={() => navigate('/home')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          ホームに戻る
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-36">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-heading">登園前入力</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(reservation.reservation_date), 'yyyy年M月d日 (E)', { locale: ja })}
          </p>
        </div>
      </div>

      {/* 予約情報カード */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/30 rounded-2xl p-4 mb-6 flex items-center gap-3">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <iconify-icon icon="solar:paw-print-bold" width="24" height="24" class="text-primary"></iconify-icon>
        </div>
        <div>
          <p className="font-bold">{reservation.dog_name}</p>
          <p className="text-xs text-muted-foreground">
            {reservation.reservation_time} 登園予定
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 排泄 */}
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:toilet-paper-bold" width="20" height="20" class="text-chart-3"></iconify-icon>
            排泄
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            前日夜〜今朝の排泄状況をお知らせください
          </p>
          <div className="grid grid-cols-2 gap-3">
            <CheckboxItem
              id="morning_urination"
              label="今朝オシッコした"
              checked={formData.morning_urination}
              onChange={(checked) => setFormData({ ...formData, morning_urination: checked })}
            />
            <CheckboxItem
              id="morning_defecation"
              label="今朝ウンチした"
              checked={formData.morning_defecation}
              onChange={(checked) => setFormData({ ...formData, morning_defecation: checked })}
            />
            <CheckboxItem
              id="afternoon_urination"
              label="昨夜オシッコした"
              checked={formData.afternoon_urination}
              onChange={(checked) => setFormData({ ...formData, afternoon_urination: checked })}
            />
            <CheckboxItem
              id="afternoon_defecation"
              label="昨夜ウンチした"
              checked={formData.afternoon_defecation}
              onChange={(checked) => setFormData({ ...formData, afternoon_defecation: checked })}
            />
          </div>
        </section>

        {/* 食事 */}
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:bowl-bold" width="20" height="20" class="text-chart-2"></iconify-icon>
            食事
          </h2>
          <div>
            <label htmlFor="breakfast_status" className="block text-sm font-medium mb-2">
              朝ごはんの食べ具合
            </label>
            <select
              id="breakfast_status"
              value={formData.breakfast_status}
              onChange={(e) => setFormData({ ...formData, breakfast_status: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              aria-describedby="breakfast-hint"
            >
              <option value="">選択してください</option>
              <option value="完食">完食</option>
              <option value="少し残した">少し残した</option>
              <option value="半分以下">半分以下</option>
              <option value="食べていない">食べていない</option>
            </select>
            <p id="breakfast-hint" className="text-xs text-muted-foreground mt-1.5">
              いつもと比べた食欲をお選びください
            </p>
          </div>
        </section>

        {/* 体調 */}
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:heart-pulse-bold" width="20" height="20" class="text-destructive"></iconify-icon>
            体調
          </h2>
          <div>
            <label htmlFor="health_status" className="block text-sm font-medium mb-2">
              体調の変化 <span className="text-muted-foreground font-normal">(任意)</span>
            </label>
            <textarea
              id="health_status"
              value={formData.health_status}
              onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="例: 昨日から少し元気がない、咳をしている等"
            />
          </div>
        </section>

        {/* 連絡事項 */}
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:chat-round-dots-bold" width="20" height="20" class="text-chart-4"></iconify-icon>
            連絡事項
          </h2>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium mb-2">
              その他の連絡事項 <span className="text-muted-foreground font-normal">(任意)</span>
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              placeholder="例: 今日は17時お迎えが少し遅れます等"
            />
          </div>
        </section>
      </form>

      {/* 送信ボタン */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border px-5 pt-4 pb-6 z-50 safe-area-pb">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground py-4 rounded-xl text-sm font-bold 
                     hover:bg-primary/90 active:bg-primary/80 active:scale-[0.99] transition-all 
                     flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed 
                     min-h-[56px] shadow-lg"
          aria-busy={saving}
        >
          {saving ? (
            <>
              <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="animate-spin"></iconify-icon>
              送信中...
            </>
          ) : (
            <>
              <iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
              送信する
            </>
          )}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          スタッフに情報が共有されます
        </p>
      </div>
    </div>
  );
}
