import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReservationCreateData } from '../hooks/useReservationCreateData'
import { useDogFilter } from '../hooks/useDogFilter'
import { INPUT_CLASS } from '../utils/styles'
import { formatDateISO, formatDateFullWithWeekday } from '../utils/date'
import StepIndicator from '../components/reservations/StepIndicator'
import DogSelectStep from '../components/reservations/DogSelectStep'
import ReservationFooter from '../components/reservations/ReservationFooter'
import api from '../api/client'

type GroomingForm = {
  reservation_date: string
  reservation_time: string
  duration_minutes: number
  notes: string
}

const DURATION_OPTIONS = [
  { value: 30, label: '30分' },
  { value: 60, label: '60分' },
  { value: 90, label: '90分' },
  { value: 120, label: '120分' },
  { value: 150, label: '150分' },
  { value: 180, label: '180分' },
]

const TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
]

const GroomingReservationCreate = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')

  const { loading, dogs, recentReservations, invalidate } = useReservationCreateData()
  const [searchQuery, setSearchQuery] = useState('')
  const [showRecentOnly, setShowRecentOnly] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  const [form, setForm] = useState<GroomingForm>({
    reservation_date: dateParam || formatDateISO(new Date()),
    reservation_time: '10:00',
    duration_minutes: 60,
    notes: '',
  })

  const { filteredDogs, recentDogs } = useDogFilter({
    dogs,
    recentReservations,
    searchQuery,
  })

  const selectedDog = dogs.find((d) => d.id === selectedDogId)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: name === 'duration_minutes' ? Number(value) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDogId) {
      alert('犬を選択してください')
      return
    }

    setSaving(true)
    try {
      await api.post('/reservations', {
        dog_id: selectedDogId,
        reservation_date: form.reservation_date,
        reservation_time: form.reservation_time,
        memo: form.notes,
        service_type: 'grooming',
        service_details: { duration_minutes: form.duration_minutes },
      })

      invalidate()
      navigate('/reservations')
    } catch (error) {
      console.error('Error creating grooming reservation:', error)
      alert('予約登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // Calculate estimated end time for display
  const getEndTime = () => {
    const [hours, minutes] = form.reservation_time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + form.duration_minutes
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="pb-32">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between safe-area-pt">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reservations')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <Icon icon="solar:close-circle-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">トリミング予約登録</h1>
        </div>
      </header>

      <StepIndicator
        currentStep={currentStep}
        canGoToStep2={Boolean(form.reservation_date && form.reservation_time)}
        canGoToStep3={Boolean(selectedDogId)}
        onStepChange={setCurrentStep}
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* Step 1: Date + Time + Duration */}
        {currentStep === 1 && (
          <GroomingDateTimeStep
            form={form}
            onChange={handleChange}
            endTime={getEndTime()}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {/* Step 2: Dog selection */}
        {currentStep === 2 && (
          <DogSelectStep
            recentDogs={recentDogs}
            filteredDogs={filteredDogs}
            recentReservations={recentReservations}
            selectedDogId={selectedDogId}
            showRecentOnly={showRecentOnly}
            searchQuery={searchQuery}
            onSelectDog={setSelectedDogId}
            onToggleRecent={() => setShowRecentOnly(!showRecentOnly)}
            onSearchChange={(value) => {
              setSearchQuery(value)
              setShowRecentOnly(false)
            }}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {/* Step 3: Confirmation */}
        {currentStep === 3 && (
          <GroomingConfirmStep
            form={form}
            selectedDogName={selectedDog?.name || ''}
            endTime={getEndTime()}
            onChange={handleChange}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </form>

      <ReservationFooter
        isSaving={saving}
        isDisabled={!selectedDogId}
        summaryName={selectedDog?.name}
        summaryOwner={selectedDog?.owner_name}
        reservationDate={form.reservation_date}
        reservationTime={form.reservation_time}
        pickupTime={getEndTime()}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

// ---------- Sub-components ----------

function GroomingDateTimeStep({
  form,
  onChange,
  endTime,
  onNext,
}: {
  form: GroomingForm
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  endTime: string
  onNext: () => void
}) {
  const [error, setError] = useState('')

  function handleNext(): void {
    if (!form.reservation_date || !form.reservation_time) {
      setError('日付と時間を選択してください')
      return
    }
    setError('')
    onNext()
  }

  return (
    <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2">
          <Icon icon="solar:calendar-bold" className="text-primary size-4" />
          予約日時
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">日付</label>
          <input
            type="date"
            name="reservation_date"
            value={form.reservation_date}
            onChange={onChange}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">来店時間</label>
          <select
            name="reservation_time"
            value={form.reservation_time}
            onChange={onChange}
            className={INPUT_CLASS}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">施術時間</label>
          <select
            name="duration_minutes"
            value={form.duration_minutes}
            onChange={onChange}
            className={INPUT_CLASS}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl">
          <Icon icon="solar:clock-circle-bold" className="size-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            終了予定: <span className="font-bold text-foreground">{endTime}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm">
          <Icon icon="solar:danger-triangle-bold" className="size-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleNext}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors min-h-[48px]"
        >
          次へ
        </button>
      </div>
    </section>
  )
}

function GroomingConfirmStep({
  form,
  selectedDogName,
  endTime,
  onChange,
  onBack,
}: {
  form: GroomingForm
  selectedDogName: string
  endTime: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBack: () => void
}) {
  return (
    <>
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
          <Icon icon="solar:notes-bold" className="text-muted-foreground size-4" />
          備考
        </h3>
        <textarea
          name="notes"
          value={form.notes}
          onChange={onChange}
          placeholder="施術内容やスタッフへの連絡事項があれば入力"
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
      </section>

      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
          <Icon icon="solar:check-circle-bold" className="text-chart-2 size-4" />
          予約内容の確認
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">日付</span>
            <span className="font-medium">{formatDateFullWithWeekday(form.reservation_date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">来店時間</span>
            <span className="font-medium">{form.reservation_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">施術時間</span>
            <span className="font-medium">{form.duration_minutes}分</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">終了予定</span>
            <span className="font-medium">{endTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ワンちゃん</span>
            <span className="font-medium">{selectedDogName || '未選択'}</span>
          </div>
        </div>
        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
          >
            戻る
          </button>
        </div>
      </section>
    </>
  )
}

export default GroomingReservationCreate
