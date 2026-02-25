import { useState, useEffect } from 'react';
import { Icon } from '../../components/Icon'
import { useParams, useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { getAxiosErrorMessage } from '../../utils/error';
import { useToast } from '../../components/Toast'
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import type { DaycarePreVisitData } from '../../types/daycarePreVisit';
import { DEFAULT_DAYCARE_DATA } from '../../types/daycarePreVisit';
import { useLiffAuthStore } from '../store/authStore';
import type { RecordType } from '../../types/record';

interface PreVisitReservation {
  id: number;
  dog_id: number;
  dog_name: string;
  reservation_date: string;
  reservation_time: string;
  service_type?: 'daycare' | 'grooming' | 'hotel';
  pre_visit_service_type?: 'daycare' | 'grooming' | 'hotel';
  has_pre_visit_input: boolean;
  daycare_data?: DaycarePreVisitData | null;
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

function RadioRow<T extends string>({
  label,
  name,
  value,
  options,
  onChange,
}: {
  label: string
  name: string
  value: T
  options: { value: T; label: string; danger?: boolean }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border/50 last:border-b-0">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
              value === opt.value
                ? opt.danger ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                : 'border-muted-foreground/30'
            }`}>
              {value === opt.value && <div className="size-2 rounded-full bg-white" />}
            </div>
            <span className={`text-sm ${opt.danger && value === opt.value ? 'text-destructive font-medium' : ''}`}>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function BooleanRow({
  label,
  name,
  value,
  detail,
  onValueChange,
  onDetailChange,
  detailPlaceholder,
}: {
  label: string
  name: string
  value: boolean
  detail?: string
  onValueChange: (v: boolean) => void
  onDetailChange: (v: string) => void
  detailPlaceholder?: string
}) {
  return (
    <div className="py-3 border-b border-border/50 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium w-20 shrink-0">{label}</span>
        <div className="flex gap-2">
          {[false, true].map((opt) => (
            <label key={String(opt)} className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name={name} checked={value === opt} onChange={() => onValueChange(opt)} className="sr-only" />
              <div className={`size-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                value === opt
                  ? opt ? 'border-destructive bg-destructive' : 'border-primary bg-primary'
                  : 'border-muted-foreground/30'
              }`}>
                {value === opt && <div className="size-2 rounded-full bg-white" />}
              </div>
              <span className={`text-sm ${opt && value === opt ? 'text-destructive font-medium' : ''}`}>{opt ? 'あり' : 'なし'}</span>
            </label>
          ))}
        </div>
      </div>
      {value && (
        <input
          type="text"
          value={detail ?? ''}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder ?? '詳細を入力'}
          className="mt-2 ml-[calc(5rem+0.75rem)] w-[calc(100%-5rem-0.75rem)] px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[40px]
                     focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
      )}
    </div>
  )
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | undefined
  onChange: (v: string) => void
}) {
  const [hour, minute] = (value || '').split(':')
  const handleChange = (h: string, m: string) => {
    if (h || m) onChange(`${h || ''}:${m || ''}`)
    else onChange('')
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium w-20 shrink-0">{label}</span>
      <input
        type="number"
        min={0} max={23}
        value={hour ?? ''}
        onChange={(e) => handleChange(e.target.value, minute ?? '')}
        placeholder="--"
        className="w-16 px-2 py-2 rounded-lg border border-border bg-input text-center text-sm min-h-[40px]"
      />
      <span className="text-sm">時</span>
      <input
        type="number"
        min={0} max={59}
        value={minute ?? ''}
        onChange={(e) => handleChange(hour ?? '', e.target.value)}
        placeholder="--"
        className="w-16 px-2 py-2 rounded-lg border border-border bg-input text-center text-sm min-h-[40px]"
      />
      <span className="text-sm">分頃</span>
    </div>
  )
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
  const { showToast } = useToast()
  const selectedBusinessType = useLiffAuthStore((s) => s.selectedBusinessType || s.owner?.primaryBusinessType || 'daycare');
  const serviceType: RecordType = selectedBusinessType || 'daycare';
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

          // 既存の事前入力データがあれば、保存されている業種に応じて読み込む
          if (res.has_pre_visit_input) {
            const savedServiceType: RecordType = res.pre_visit_service_type || res.service_type || 'daycare';
            if (savedServiceType === 'daycare' && res.daycare_data) {
              setDaycareData({
                ...DEFAULT_DAYCARE_DATA,
                ...res.daycare_data,
              });
            }
            if (savedServiceType === 'grooming') {
              setGroomingData(normalizeGroomingPreVisitData(res.grooming_data));
            }
            if (savedServiceType === 'hotel') {
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
      const payload: Record<string, unknown> = {
        reservation_id: parseInt(reservationId),
        service_type: serviceType,
      };

      if (serviceType === 'daycare') {
        Object.assign(payload, {
          daycare_data: daycareData,
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
      showToast(getAxiosErrorMessage(error, '事前入力の保存に失敗しました'), 'error');
    } finally {
      setSaving(false);
    }
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
      const response = await liffClient.get(`/pre-visit-inputs/latest/${reservation.dog_id}`, {
        params: { service_type: serviceType },
      });
      const lastRecord = response.data;
      if (serviceType === 'daycare' && lastRecord.daycare_data) {
        setDaycareData({
          ...DEFAULT_DAYCARE_DATA,
          ...lastRecord.daycare_data,
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
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted active:scale-95 transition-all"
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
                   flex items-center justify-center gap-2 active:bg-primary/5 active:scale-[0.98] transition-all
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
            {/* お迎え予定 */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-chart-4" />
                お迎え予定
              </h2>
              <RadioRow
                label="時間"
                name="pickup_time"
                value={daycareData.pickup_time}
                options={[
                  { value: '17:00' as const, label: '17時' },
                  { value: '17:30' as const, label: '17時半' },
                  { value: '18:00' as const, label: '18時' },
                  { value: 'other' as const, label: 'その他' },
                ]}
                onChange={(v) => setDaycareData({ ...daycareData, pickup_time: v })}
              />
              {daycareData.pickup_time === 'other' && (
                <input
                  type="text"
                  value={daycareData.pickup_time_other ?? ''}
                  onChange={(e) => setDaycareData({ ...daycareData, pickup_time_other: e.target.value })}
                  placeholder="お迎え時間を入力"
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[40px]
                             focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
              )}
            </section>

            {/* 健康状態 */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:heart-pulse-bold" width="20" height="20" className="text-destructive" />
                健康状態
              </h2>
              <RadioRow
                label="元気"
                name="energy"
                value={daycareData.energy}
                options={[
                  { value: 'good' as const, label: 'あり' },
                  { value: 'poor' as const, label: 'なし', danger: true },
                ]}
                onChange={(v) => setDaycareData({ ...daycareData, energy: v })}
              />
              {daycareData.energy === 'poor' && (
                <input type="text" value={daycareData.energy_detail ?? ''} onChange={(e) => setDaycareData({ ...daycareData, energy_detail: e.target.value })} placeholder="詳細を入力" className="mb-2 ml-[calc(5rem+0.75rem)] w-[calc(100%-5rem-0.75rem)] px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[40px] focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              )}
              <RadioRow
                label="食欲"
                name="appetite"
                value={daycareData.appetite}
                options={[
                  { value: 'good' as const, label: 'あり' },
                  { value: 'poor' as const, label: 'なし', danger: true },
                ]}
                onChange={(v) => setDaycareData({ ...daycareData, appetite: v })}
              />
              {daycareData.appetite === 'poor' && (
                <input type="text" value={daycareData.appetite_detail ?? ''} onChange={(e) => setDaycareData({ ...daycareData, appetite_detail: e.target.value })} placeholder="詳細を入力" className="mb-2 ml-[calc(5rem+0.75rem)] w-[calc(100%-5rem-0.75rem)] px-3 py-2 rounded-lg border border-border bg-input text-sm min-h-[40px] focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              )}
              <RadioRow
                label="うんち"
                name="poop"
                value={daycareData.poop}
                options={[
                  { value: 'normal' as const, label: '問題なし' },
                  { value: 'soft' as const, label: '軟便', danger: true },
                  { value: 'bloody' as const, label: '血便', danger: true },
                ]}
                onChange={(v) => setDaycareData({ ...daycareData, poop: v })}
              />
              <RadioRow
                label="おしっこ"
                name="pee"
                value={daycareData.pee}
                options={[
                  { value: 'normal' as const, label: '問題なし' },
                  { value: 'dark' as const, label: '色が濃い', danger: true },
                  { value: 'bloody' as const, label: '血尿', danger: true },
                ]}
                onChange={(v) => setDaycareData({ ...daycareData, pee: v })}
              />
              <BooleanRow
                label="嘔吐"
                name="vomiting"
                value={daycareData.vomiting}
                detail={daycareData.vomiting_detail}
                onValueChange={(v) => setDaycareData({ ...daycareData, vomiting: v })}
                onDetailChange={(v) => setDaycareData({ ...daycareData, vomiting_detail: v })}
                detailPlaceholder="嘔吐の詳細を入力"
              />
              <BooleanRow
                label="かゆみ"
                name="itching"
                value={daycareData.itching}
                detail={daycareData.itching_detail}
                onValueChange={(v) => setDaycareData({ ...daycareData, itching: v })}
                onDetailChange={(v) => setDaycareData({ ...daycareData, itching_detail: v })}
                detailPlaceholder="かゆみの詳細を入力"
              />
              <BooleanRow
                label="投薬"
                name="medication"
                value={daycareData.medication}
                detail={daycareData.medication_detail}
                onValueChange={(v) => setDaycareData({ ...daycareData, medication: v })}
                onDetailChange={(v) => setDaycareData({ ...daycareData, medication_detail: v })}
                detailPlaceholder="薬名・タイミングなど"
              />
            </section>

            {/* 最後の排泄・食事 */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:clock-circle-bold" width="20" height="20" className="text-chart-2" />
                最後の排泄・食事
              </h2>
              <div className="space-y-3">
                <TimeInput label="うんち" value={daycareData.last_poop_time} onChange={(v) => setDaycareData({ ...daycareData, last_poop_time: v })} />
                <TimeInput label="おしっこ" value={daycareData.last_pee_time} onChange={(v) => setDaycareData({ ...daycareData, last_pee_time: v })} />
                <TimeInput label="ごはん" value={daycareData.last_meal_time} onChange={(v) => setDaycareData({ ...daycareData, last_meal_time: v })} />
              </div>
            </section>

            {/* ご家庭からのコメント */}
            <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
              <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
                <Icon icon="solar:chat-round-dots-bold" width="20" height="20" className="text-chart-4" />
                ご家庭からのコメント
              </h2>
              <textarea
                value={daycareData.notes ?? ''}
                onChange={(e) => setDaycareData({ ...daycareData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground resize-none
                           focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="スタッフに伝えたいことがあればご記入ください"
              />
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
