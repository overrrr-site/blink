import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon'
import { useParams, useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { getAxiosErrorMessage } from '../../utils/error';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { MealEntry } from '../../types/meal';

interface PreVisitReservation {
  id: number;
  dog_id: number;
  dog_name: string;
  reservation_date: string;
  reservation_time: string;
  service_type?: 'daycare' | 'grooming' | 'hotel';
  has_pre_visit_input: boolean;
  morning_urination?: boolean;
  morning_defecation?: boolean;
  afternoon_urination?: boolean;
  afternoon_defecation?: boolean;
  breakfast_status?: string;
  health_status?: string;
  pre_visit_notes?: string;
  meal_data?: MealEntry[];
  grooming_data?: GroomingPreVisitData;
  hotel_data?: HotelPreVisitData;
}

interface GroomingPreVisitData {
  counseling?: {
    style_request?: string;
    caution_notes?: string;
    condition_notes?: string;
    consent_confirmed?: boolean;
  };
  pre_visit?: {
    pickup_time?: string;
    completion_contact?: 'line' | 'phone' | 'none';
    day_of_notes?: string;
  };
}

interface HotelPreVisitData {
  feeding_schedule?: {
    morning?: string;
    evening?: string;
    snack?: string;
  };
  medication?: {
    has_medication?: boolean;
    details?: string;
  };
  walk_preference?: string;
  sleeping_habit?: string;
  special_notes?: string;
  emergency_contact_confirmed?: boolean;
}

const DEFAULT_DAYCARE_DATA = {
  morning_urination: false,
  morning_defecation: false,
  afternoon_urination: false,
  afternoon_defecation: false,
  breakfast_status: '',
  health_status: '',
  notes: '',
  meal_data: [] as MealEntry[],
};

const DEFAULT_GROOMING_DATA: GroomingPreVisitData = {
  counseling: {
    style_request: '',
    caution_notes: '',
    condition_notes: '',
    consent_confirmed: false,
  },
  pre_visit: {
    pickup_time: '',
    completion_contact: 'line',
    day_of_notes: '',
  },
};

const DEFAULT_HOTEL_DATA: HotelPreVisitData = {
  feeding_schedule: { morning: '', evening: '', snack: '' },
  medication: { has_medication: false, details: '' },
  walk_preference: '',
  sleeping_habit: '',
  special_notes: '',
  emergency_contact_confirmed: false,
};

function normalizeGroomingPreVisitData(raw: unknown): GroomingPreVisitData {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_GROOMING_DATA;
  }

  const source = raw as GroomingPreVisitData;

  return {
    counseling: {
      style_request: source.counseling?.style_request || '',
      caution_notes: source.counseling?.caution_notes || '',
      condition_notes: source.counseling?.condition_notes || '',
      consent_confirmed: source.counseling?.consent_confirmed || false,
    },
    pre_visit: {
      pickup_time: source.pre_visit?.pickup_time || '',
      completion_contact: source.pre_visit?.completion_contact || 'line',
      day_of_notes: source.pre_visit?.day_of_notes || '',
    },
  };
}

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
          <Icon icon="solar:check-linear" width="16" height="16" className="text-white" />
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
  const [loadingLastRecord, setLoadingLastRecord] = useState(false);
  const [reservation, setReservation] = useState<PreVisitReservation | null>(null);
  const [daycareData, setDaycareData] = useState(DEFAULT_DAYCARE_DATA);
  const [groomingData, setGroomingData] = useState<GroomingPreVisitData>(DEFAULT_GROOMING_DATA);
  const [hotelData, setHotelData] = useState<HotelPreVisitData>(DEFAULT_HOTEL_DATA);

  useEffect(() => {
    const fetchReservation = async () => {
      try {
        const response = await liffClient.get('/reservations');
        const responseData = response.data as { data: PreVisitReservation[] } | PreVisitReservation[];
        const reservations = Array.isArray(responseData) ? responseData : responseData.data;
        const res = reservations.find((r) => r.id === parseInt(reservationId || '0'));
        if (res) {
          setReservation(res);
          const serviceType = res.service_type || 'daycare';
          if (serviceType === 'daycare') {
            setDaycareData(DEFAULT_DAYCARE_DATA);
          }
          if (serviceType === 'grooming') {
            setGroomingData(DEFAULT_GROOMING_DATA);
          }
          if (serviceType === 'hotel') {
            setHotelData(DEFAULT_HOTEL_DATA);
          }
          // 既存の登園前入力データがあればフォームに読み込む
          if (res.has_pre_visit_input) {
            if (serviceType === 'daycare') {
              setDaycareData({
                morning_urination: res.morning_urination ?? false,
                morning_defecation: res.morning_defecation ?? false,
                afternoon_urination: res.afternoon_urination ?? false,
                afternoon_defecation: res.afternoon_defecation ?? false,
                breakfast_status: res.breakfast_status ?? '',
                health_status: res.health_status ?? '',
                notes: res.pre_visit_notes ?? '',
                meal_data: res.meal_data ?? [],
              });
            }
            if (serviceType === 'grooming') {
              setGroomingData(normalizeGroomingPreVisitData(res.grooming_data));
            }
            if (serviceType === 'hotel') {
              setHotelData({
                ...DEFAULT_HOTEL_DATA,
                ...(res.hotel_data || {}),
              });
            }
          }
        }
      } catch {
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
      const serviceType = reservation?.service_type || 'daycare';
      const payload: Record<string, unknown> = {
        reservation_id: parseInt(reservationId),
        service_type: serviceType,
      };

      if (serviceType === 'daycare') {
        Object.assign(payload, {
          morning_urination: daycareData.morning_urination,
          morning_defecation: daycareData.morning_defecation,
          afternoon_urination: daycareData.afternoon_urination,
          afternoon_defecation: daycareData.afternoon_defecation,
          breakfast_status: daycareData.breakfast_status,
          health_status: daycareData.health_status,
          notes: daycareData.notes,
          meal_data: daycareData.meal_data.length > 0 ? daycareData.meal_data : null,
        });
      }

      if (serviceType === 'grooming') {
        Object.assign(payload, {
          grooming_data: {
            counseling: {
              style_request: groomingData.counseling?.style_request || '',
              caution_notes: groomingData.counseling?.caution_notes || '',
              condition_notes: groomingData.counseling?.condition_notes || '',
              consent_confirmed: groomingData.counseling?.consent_confirmed || false,
            },
            pre_visit: {
              pickup_time: groomingData.pre_visit?.pickup_time || '',
              completion_contact: groomingData.pre_visit?.completion_contact || 'line',
              day_of_notes: groomingData.pre_visit?.day_of_notes || '',
            },
          },
        });
      }

      if (serviceType === 'hotel') {
        Object.assign(payload, {
          hotel_data: hotelData,
        });
      }

      await liffClient.post('/pre-visit-inputs', {
        ...payload,
      });
      navigate('/home');
    } catch (error) {
      alert(getAxiosErrorMessage(error, '事前入力の保存に失敗しました'));
    } finally {
      setSaving(false);
    }
  };

  const addMealEntry = () => {
    setDaycareData(prev => ({
      ...prev,
      meal_data: [...prev.meal_data, { time: '', food_name: '', amount: '' }],
    }));
  };

  const updateMealEntry = (index: number, field: keyof MealEntry, value: string) => {
    setDaycareData(prev => ({
      ...prev,
      meal_data: prev.meal_data.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ),
    }));
  };

  const removeMealEntry = (index: number) => {
    setDaycareData(prev => ({
      ...prev,
      meal_data: prev.meal_data.filter((_, i) => i !== index),
    }));
  };

  const updateHotelFeeding = (field: 'morning' | 'evening' | 'snack', value: string) => {
    setHotelData(prev => ({
      ...prev,
      feeding_schedule: {
        ...prev.feeding_schedule,
        [field]: value,
      },
    }));
  };

  const updateHotelMedication = (field: 'has_medication' | 'details', value: boolean | string) => {
    setHotelData(prev => ({
      ...prev,
      medication: {
        ...prev.medication,
        [field]: value,
      },
    }));
  };

  const handleFillFromLastRecord = async () => {
    if (!reservation?.dog_id) return;
    setLoadingLastRecord(true);
    try {
      const serviceType = reservation?.service_type || 'daycare';
      const response = await liffClient.get(`/pre-visit-inputs/latest/${reservation.dog_id}`, {
        params: { service_type: serviceType },
      });
      const lastRecord = response.data;
      if (serviceType === 'daycare') {
        setDaycareData({
          morning_urination: lastRecord.morning_urination ?? false,
          morning_defecation: lastRecord.morning_defecation ?? false,
          afternoon_urination: lastRecord.afternoon_urination ?? false,
          afternoon_defecation: lastRecord.afternoon_defecation ?? false,
          breakfast_status: lastRecord.breakfast_status ?? '',
          health_status: lastRecord.health_status ?? '',
          notes: lastRecord.notes ?? '',
          meal_data: lastRecord.meal_data ?? [],
        });
      }
      if (serviceType === 'grooming') {
        setGroomingData(normalizeGroomingPreVisitData(lastRecord.grooming_data));
      }
      if (serviceType === 'hotel') {
        setHotelData({
          ...DEFAULT_HOTEL_DATA,
          ...(lastRecord.hotel_data || {}),
        });
      }
    } catch {
      // 過去の登園前入力がない場合は何もしない
    } finally {
      setLoadingLastRecord(false);
    }
  };

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
    return (
      <div className="px-5 pt-6 text-center">
        <Icon icon="solar:calendar-cross-bold" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
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

  const serviceType = reservation?.service_type || 'daycare';
  const serviceLabel = serviceType === 'grooming'
    ? 'トリミング事前入力'
    : serviceType === 'hotel'
      ? 'ホテル事前入力'
      : '登園前入力';
  const reservationTimeLabel = serviceType === 'daycare' ? '登園予定' : '予約時間';

  return (
    <div className="px-5 pt-6 pb-36">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold font-heading">{serviceLabel}</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(reservation.reservation_date), 'yyyy年M月d日 (E)', { locale: ja })}
          </p>
        </div>
      </div>

      {/* 予約情報カード */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/30 rounded-2xl p-4 mb-4 flex items-center gap-3">
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-primary" />
        </div>
        <div>
          <p className="font-bold">{reservation.dog_name}</p>
          <p className="text-xs text-muted-foreground">
            {reservation.reservation_time} {reservationTimeLabel}
          </p>
        </div>
      </div>

      {/* 前回と同じボタン */}
      <button
        type="button"
        onClick={handleFillFromLastRecord}
        disabled={loadingLastRecord}
        className="w-full py-3 rounded-xl border-2 border-primary/30 text-primary text-sm font-bold
                   flex items-center justify-center gap-2 active:bg-primary/5 transition-colors
                   disabled:opacity-50 mb-6"
      >
        {loadingLastRecord ? (
          <>
            <Icon icon="solar:spinner-bold" width="18" height="18" className="animate-spin" />
            読み込み中...
          </>
        ) : (
          <>
            <Icon icon="solar:copy-bold" width="18" height="18" />
            前回と同じ
          </>
        )}
      </button>

      <form onSubmit={handleSubmit} className="space-y-6">
        {serviceType === 'daycare' && (
          <>
            {/* 排泄 */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:toilet-paper-bold" width="20" height="20" className="text-chart-3" />
                排泄
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                前日夜〜今朝の排泄状況をお知らせください
              </p>
              <div className="grid grid-cols-2 gap-3">
                <CheckboxItem
                  id="morning_urination"
                  label="今朝オシッコした"
                  checked={daycareData.morning_urination}
                  onChange={(checked) => setDaycareData({ ...daycareData, morning_urination: checked })}
                />
                <CheckboxItem
                  id="morning_defecation"
                  label="今朝ウンチした"
                  checked={daycareData.morning_defecation}
                  onChange={(checked) => setDaycareData({ ...daycareData, morning_defecation: checked })}
                />
                <CheckboxItem
                  id="afternoon_urination"
                  label="昨夜オシッコした"
                  checked={daycareData.afternoon_urination}
                  onChange={(checked) => setDaycareData({ ...daycareData, afternoon_urination: checked })}
                />
                <CheckboxItem
                  id="afternoon_defecation"
                  label="昨夜ウンチした"
                  checked={daycareData.afternoon_defecation}
                  onChange={(checked) => setDaycareData({ ...daycareData, afternoon_defecation: checked })}
                />
              </div>
            </section>

            {/* 食事 */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:bowl-bold" width="20" height="20" className="text-chart-2" />
                食事
              </h2>
              <div className="mb-4">
                <label htmlFor="breakfast_status" className="block text-sm font-medium mb-2">
                  朝ごはんの食べ具合
                </label>
                <select
                  id="breakfast_status"
                  value={daycareData.breakfast_status}
                  onChange={(e) => setDaycareData({ ...daycareData, breakfast_status: e.target.value })}
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

              {/* ごはん記録 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  ごはん記録 <span className="text-muted-foreground font-normal">(任意)</span>
                </label>

                {daycareData.meal_data.map((entry, index) => (
                  <div key={index} className="bg-muted/50 rounded-xl p-3 mb-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground">ごはん {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeMealEntry(index)}
                        className="text-destructive text-xs font-medium min-h-[32px] px-2"
                      >
                        削除
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="いつ（例: 朝8時）"
                      value={entry.time}
                      onChange={(e) => updateMealEntry(index, 'time', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm min-h-[44px]
                             focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <input
                      type="text"
                      placeholder="フード名（例: ロイカナ）"
                      value={entry.food_name}
                      onChange={(e) => updateMealEntry(index, 'food_name', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm min-h-[44px]
                             focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <input
                      type="text"
                      placeholder="量（例: 50g）"
                      value={entry.amount}
                      onChange={(e) => updateMealEntry(index, 'amount', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-input text-sm min-h-[44px]
                             focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addMealEntry}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground font-medium
                         flex items-center justify-center gap-1.5 active:bg-muted transition-colors"
                >
                  <Icon icon="solar:add-circle-linear" width="18" height="18" />
                  ごはんを追加
                </button>
              </div>
            </section>

            {/* 体調 */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:heart-pulse-bold" width="20" height="20" className="text-destructive" />
                体調
              </h2>
              <div>
                <label htmlFor="health_status" className="block text-sm font-medium mb-2">
                  体調の変化 <span className="text-muted-foreground font-normal">(任意)</span>
                </label>
                <textarea
                  id="health_status"
                  value={daycareData.health_status}
                  onChange={(e) => setDaycareData({ ...daycareData, health_status: e.target.value })}
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
                <Icon icon="solar:chat-round-dots-bold" width="20" height="20" className="text-chart-4" />
                連絡事項
              </h2>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-2">
                  その他の連絡事項 <span className="text-muted-foreground font-normal">(任意)</span>
                </label>
                <textarea
                  id="notes"
                  value={daycareData.notes}
                  onChange={(e) => setDaycareData({ ...daycareData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="例: 今日は17時お迎えが少し遅れます等"
                />
              </div>
            </section>
          </>
        )}

        {serviceType === 'grooming' && (
          <>
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:scissors-bold" width="20" height="20" className="text-violet-500" />
                来店時カウンセリング
              </h2>
              <label htmlFor="style_request" className="block text-sm font-medium mb-2">
                希望スタイル <span className="text-muted-foreground font-normal">(任意)</span>
              </label>
              <textarea
                id="style_request"
                value={groomingData.counseling?.style_request ?? ''}
                onChange={(e) => setGroomingData({
                  ...groomingData,
                  counseling: {
                    ...(groomingData.counseling || {}),
                    style_request: e.target.value,
                  },
                })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="例: 体は6mm、顔は丸めでお願いします"
              />

              <label htmlFor="caution_notes" className="block text-sm font-medium mt-4 mb-2">
                注意事項 <span className="text-muted-foreground font-normal">(任意)</span>
              </label>
              <textarea
                id="caution_notes"
                value={groomingData.counseling?.caution_notes ?? ''}
                onChange={(e) => setGroomingData({
                  ...groomingData,
                  counseling: {
                    ...(groomingData.counseling || {}),
                    caution_notes: e.target.value,
                  },
                })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="例: 耳まわりは敏感、前足は苦手です"
              />

              <label htmlFor="condition_notes" className="block text-sm font-medium mt-4 mb-2">
                当日の体調・変化 <span className="text-muted-foreground font-normal">(任意)</span>
              </label>
              <textarea
                id="condition_notes"
                value={groomingData.counseling?.condition_notes ?? ''}
                onChange={(e) => setGroomingData({
                  ...groomingData,
                  counseling: {
                    ...(groomingData.counseling || {}),
                    condition_notes: e.target.value,
                  },
                })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="例: かゆみが少しあります。投薬を始めました"
              />

              <CheckboxItem
                id="consent_confirmed"
                label="内容を確認済み（任意）"
                checked={!!groomingData.counseling?.consent_confirmed}
                onChange={(checked) => setGroomingData({
                  ...groomingData,
                  counseling: {
                    ...(groomingData.counseling || {}),
                    consent_confirmed: checked,
                  },
                })}
              />

              <div className="mt-5 pt-5 border-t border-border/80">
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <Icon icon="solar:clock-circle-bold" width="18" height="18" className="text-chart-2" />
                  当日運用メモ（LIFF事前入力向け）
                </h3>

                <label htmlFor="pickup_time" className="block text-sm font-medium mb-2">
                  お迎え予定時刻 <span className="text-muted-foreground font-normal">(任意)</span>
                </label>
                <input
                  id="pickup_time"
                  type="time"
                  value={groomingData.pre_visit?.pickup_time ?? ''}
                  onChange={(e) => setGroomingData({
                    ...groomingData,
                    pre_visit: {
                      ...(groomingData.pre_visit || {}),
                      pickup_time: e.target.value,
                    },
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />

                <label htmlFor="completion_contact" className="block text-sm font-medium mt-4 mb-2">
                  仕上がり連絡の希望 <span className="text-muted-foreground font-normal">(任意)</span>
                </label>
                <select
                  id="completion_contact"
                  value={groomingData.pre_visit?.completion_contact ?? 'line'}
                  onChange={(e) => setGroomingData({
                    ...groomingData,
                    pre_visit: {
                      ...(groomingData.pre_visit || {}),
                      completion_contact: e.target.value as 'line' | 'phone' | 'none',
                    },
                  })}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                >
                  <option value="line">LINEで連絡</option>
                  <option value="phone">電話で連絡</option>
                  <option value="none">連絡不要</option>
                </select>

                <label htmlFor="day_of_notes" className="block text-sm font-medium mt-4 mb-2">
                  当日メモ <span className="text-muted-foreground font-normal">(任意)</span>
                </label>
                <textarea
                  id="day_of_notes"
                  value={groomingData.pre_visit?.day_of_notes ?? ''}
                  onChange={(e) => setGroomingData({
                    ...groomingData,
                    pre_visit: {
                      ...(groomingData.pre_visit || {}),
                      day_of_notes: e.target.value,
                    },
                  })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="例: 今日は帰宅後すぐ散歩予定です"
                />
              </div>
            </section>
          </>
        )}

        {serviceType === 'hotel' && (
          <>
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:bowl-bold" width="20" height="20" className="text-chart-2" />
                食事について
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="朝ごはん（時間・内容）"
                  value={hotelData.feeding_schedule?.morning ?? ''}
                  onChange={(e) => updateHotelFeeding('morning', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <input
                  type="text"
                  placeholder="夜ごはん（時間・内容）"
                  value={hotelData.feeding_schedule?.evening ?? ''}
                  onChange={(e) => updateHotelFeeding('evening', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <input
                  type="text"
                  placeholder="おやつ"
                  value={hotelData.feeding_schedule?.snack ?? ''}
                  onChange={(e) => updateHotelFeeding('snack', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </section>

            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:pill-bold" width="20" height="20" className="text-chart-3" />
                お薬
              </h2>
              <CheckboxItem
                id="has_medication"
                label="投薬があります"
                checked={!!hotelData.medication?.has_medication}
                onChange={(checked) => updateHotelMedication('has_medication', checked)}
              />
              {hotelData.medication?.has_medication && (
                <textarea
                  value={hotelData.medication?.details ?? ''}
                  onChange={(e) => updateHotelMedication('details', e.target.value)}
                  rows={3}
                  className="w-full mt-3 px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="薬名・タイミングなど"
                />
              )}
            </section>

            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:walk-bold" width="20" height="20" className="text-chart-1" />
                お散歩の希望
              </h2>
              <select
                value={hotelData.walk_preference ?? ''}
                onChange={(e) => setHotelData({ ...hotelData, walk_preference: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                <option value="">選択してください</option>
                <option value="朝のみ">朝のみ</option>
                <option value="朝夕">朝夕</option>
                <option value="お散歩不要">お散歩不要</option>
              </select>
            </section>

            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:bed-bold" width="20" height="20" className="text-chart-4" />
                寝る時の習慣
              </h2>
              <select
                value={hotelData.sleeping_habit ?? ''}
                onChange={(e) => setHotelData({ ...hotelData, sleeping_habit: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground min-h-[52px]
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              >
                <option value="">選択してください</option>
                <option value="ケージ">ケージ</option>
                <option value="フリー">フリー</option>
                <option value="どちらでも">どちらでも</option>
              </select>
            </section>

            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:chat-round-dots-bold" width="20" height="20" className="text-chart-2" />
                その他の特記事項
              </h2>
              <textarea
                value={hotelData.special_notes ?? ''}
                onChange={(e) => setHotelData({ ...hotelData, special_notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                         focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="スタッフに伝えておきたいこと"
              />
            </section>

            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:phone-rounded-bold" width="20" height="20" className="text-chart-3" />
                緊急連絡先の確認
              </h2>
              <CheckboxItem
                id="emergency_contact_confirmed"
                label="緊急連絡先に変更はありません"
                checked={!!hotelData.emergency_contact_confirmed}
                onChange={(checked) => setHotelData({ ...hotelData, emergency_contact_confirmed: checked })}
              />
            </section>
          </>
        )}
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
              <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
              送信中...
            </>
          ) : (
            <>
              <Icon icon="solar:check-circle-bold" width="20" height="20" />
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
