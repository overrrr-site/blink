import { useState, useMemo } from 'react'
import { useEffect } from 'react'
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

type HotelForm = {
  checkin_date: string
  checkin_time: string
  checkout_date: string
  checkout_time: string
  notes: string
}

type HotelRoomAvailability = {
  id: number
  room_name: string
  room_size: '小型' | '中型' | '大型'
  capacity: number
  is_available: boolean
  conflict_reservation_id?: number | null
}

const TIME_OPTIONS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
]

function calculateNights(checkinDate: string, checkoutDate: string): number {
  if (!checkinDate || !checkoutDate) return 0
  const start = new Date(checkinDate)
  const end = new Date(checkoutDate)
  const diff = end.getTime() - start.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const HotelReservationCreate = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')

  const { loading, dogs, recentReservations, invalidate } = useReservationCreateData()
  const [searchQuery, setSearchQuery] = useState('')
  const [showRecentOnly, setShowRecentOnly] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [availableRooms, setAvailableRooms] = useState<HotelRoomAvailability[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [roomError, setRoomError] = useState('')

  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return formatDateISO(d)
  }, [])

  const [form, setForm] = useState<HotelForm>({
    checkin_date: dateParam || formatDateISO(new Date()),
    checkin_time: '14:00',
    checkout_date: dateParam ? '' : tomorrow,
    checkout_time: '11:00',
    notes: '',
  })

  const nights = calculateNights(form.checkin_date, form.checkout_date)

  const { filteredDogs, recentDogs } = useDogFilter({
    dogs,
    recentReservations,
    searchQuery,
  })

  const selectedDog = dogs.find((d) => d.id === selectedDogId)
  const selectedRoom = availableRooms.find((room) => room.id === selectedRoomId)

  useEffect(() => {
    const canSearchRooms = Boolean(form.checkin_date && form.checkin_time && form.checkout_date && form.checkout_time && nights > 0)
    if (!canSearchRooms) {
      setAvailableRooms([])
      setSelectedRoomId(null)
      setRoomError('')
      return
    }

    const fetchAvailability = async () => {
      setLoadingRooms(true)
      setRoomError('')
      try {
        const response = await api.get<HotelRoomAvailability[]>('/reservations/hotel-availability', {
          params: {
            checkin_datetime: `${form.checkin_date}T${form.checkin_time}`,
            checkout_datetime: `${form.checkout_date}T${form.checkout_time}`,
          },
        })
        const rooms = response.data || []
        setAvailableRooms(rooms)

        if (rooms.length === 0) {
          setSelectedRoomId(null)
          setRoomError('利用可能な部屋が登録されていません')
          return
        }

        const availableIds = rooms.filter((room) => room.is_available).map((room) => room.id)
        if (availableIds.length === 0) {
          setSelectedRoomId(null)
          setRoomError('この期間は満室です。日程を変更してください')
          return
        }

        setSelectedRoomId((prev) => (prev && availableIds.includes(prev) ? prev : availableIds[0]))
      } catch {
        setAvailableRooms([])
        setSelectedRoomId(null)
        setRoomError('部屋の空き状況取得に失敗しました')
      } finally {
        setLoadingRooms(false)
      }
    }

    fetchAvailability()
  }, [
    form.checkin_date,
    form.checkin_time,
    form.checkout_date,
    form.checkout_time,
    nights,
  ])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Auto-adjust checkout_date if checkin_date changes and checkout is before checkin
      if (name === 'checkin_date' && next.checkout_date && next.checkout_date <= value) {
        const nextDay = new Date(value)
        nextDay.setDate(nextDay.getDate() + 1)
        next.checkout_date = formatDateISO(nextDay)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDogId) {
      alert('犬を選択してください')
      return
    }
    if (nights <= 0) {
      alert('チェックアウト日はチェックイン日より後にしてください')
      return
    }
    if (!selectedRoomId) {
      alert('部屋を選択してください')
      return
    }

    setSaving(true)
    try {
      await api.post('/reservations', {
        dog_id: selectedDogId,
        reservation_date: form.checkin_date,
        reservation_time: form.checkin_time,
        end_datetime: `${form.checkout_date}T${form.checkout_time || '18:00'}`,
        memo: form.notes,
        service_type: 'hotel',
        room_id: selectedRoomId,
      })

      invalidate()
      navigate('/reservations')
    } catch (error) {
      console.error('Error creating hotel reservation:', error)
      alert('予約登録に失敗しました')
    } finally {
      setSaving(false)
    }
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
          <h1 className="text-lg font-bold font-heading">ホテル予約登録</h1>
        </div>
      </header>

      <StepIndicator
        currentStep={currentStep}
        canGoToStep2={Boolean(form.checkin_date && form.checkout_date && nights > 0 && selectedRoomId)}
        canGoToStep3={Boolean(selectedDogId)}
        onStepChange={setCurrentStep}
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* Step 1: Check-in / Check-out dates */}
        {currentStep === 1 && (
          <HotelDateStep
            form={form}
            nights={nights}
            rooms={availableRooms}
            loadingRooms={loadingRooms}
            roomError={roomError}
            selectedRoomId={selectedRoomId}
            onSelectRoom={setSelectedRoomId}
            onChange={handleChange}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {/* Step 2: Dog selection */}
        {currentStep === 2 && (
          <DogSelectStep
            title="宿泊するワンちゃん"
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

        {/* Step 3: Notes + Confirmation */}
        {currentStep === 3 && (
          <HotelConfirmStep
            form={form}
            nights={nights}
            selectedDogName={selectedDog?.name || ''}
            selectedRoomName={selectedRoom ? `${selectedRoom.room_name} (${selectedRoom.room_size})` : ''}
            onChange={handleChange}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </form>

      <ReservationFooter
        isSaving={saving}
        isDisabled={!selectedDogId || nights <= 0 || !selectedRoomId}
        summaryName={selectedDog?.name}
        summaryOwner={selectedDog?.owner_name}
        reservationDate={form.checkin_date}
        reservationTime={form.checkin_time}
        pickupTime={`${form.checkout_date ? formatDateFullWithWeekday(form.checkout_date) : ''} ${form.checkout_time}`}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

// ---------- Sub-components ----------

function HotelDateStep({
  form,
  nights,
  rooms,
  loadingRooms,
  roomError,
  selectedRoomId,
  onSelectRoom,
  onChange,
  onNext,
}: {
  form: HotelForm
  nights: number
  rooms: HotelRoomAvailability[]
  loadingRooms: boolean
  roomError: string
  selectedRoomId: number | null
  onSelectRoom: (roomId: number) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void
  onNext: () => void
}) {
  const [error, setError] = useState('')

  function handleNext(): void {
    if (!form.checkin_date || !form.checkout_date) {
      setError('チェックイン日とチェックアウト日を選択してください')
      return
    }
    if (nights <= 0) {
      setError('チェックアウト日はチェックイン日より後にしてください')
      return
    }
    if (!selectedRoomId) {
      setError('空いている部屋を選択してください')
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
          宿泊期間
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">チェックイン日</label>
          <input
            type="date"
            name="checkin_date"
            value={form.checkin_date}
            onChange={onChange}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">チェックイン時間 (任意)</label>
          <select
            name="checkin_time"
            value={form.checkin_time}
            onChange={onChange}
            className={INPUT_CLASS}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">チェックアウト日</label>
          <input
            type="date"
            name="checkout_date"
            value={form.checkout_date}
            min={form.checkin_date}
            onChange={onChange}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground mb-1">チェックアウト時間 (任意)</label>
          <select
            name="checkout_time"
            value={form.checkout_time}
            onChange={onChange}
            className={INPUT_CLASS}
          >
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {nights > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
            <Icon icon="solar:moon-bold" className="size-4 text-primary" />
            <span className="text-sm font-bold text-primary">
              {nights}泊
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatDateFullWithWeekday(form.checkin_date)} ~ {formatDateFullWithWeekday(form.checkout_date)})
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs text-muted-foreground mb-2">部屋割り</label>
          {loadingRooms ? (
            <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl">
              空室を確認中...
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => {
                const selected = selectedRoomId === room.id
                const disabled = !room.is_available
                return (
                  <button
                    key={room.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectRoom(room.id)}
                    className={`w-full px-3 py-2 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : disabled
                          ? 'border-border bg-muted/30 text-muted-foreground cursor-not-allowed'
                          : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{room.room_name}</span>
                      <span className="text-xs text-muted-foreground">{room.room_size} / 定員{room.capacity}</span>
                    </div>
                    {!room.is_available && (
                      <p className="text-xs text-destructive mt-1">同時間帯で利用中</p>
                    )}
                  </button>
                )
              })}
              {rooms.length === 0 && !roomError && (
                <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-xl">
                  部屋が登録されていません
                </p>
              )}
            </div>
          )}
          {roomError && (
            <p className="text-xs text-destructive mt-2">{roomError}</p>
          )}
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

function HotelConfirmStep({
  form,
  nights,
  selectedDogName,
  selectedRoomName,
  onChange,
  onBack,
}: {
  form: HotelForm
  nights: number
  selectedDogName: string
  selectedRoomName: string
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
          placeholder="お預かり時の注意事項や特別なケアがあれば入力"
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
            <span className="text-muted-foreground">チェックイン</span>
            <span className="font-medium">{formatDateFullWithWeekday(form.checkin_date)} {form.checkin_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">チェックアウト</span>
            <span className="font-medium">{formatDateFullWithWeekday(form.checkout_date)} {form.checkout_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">宿泊数</span>
            <span className="font-bold text-primary">{nights}泊</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">ワンちゃん</span>
            <span className="font-medium">{selectedDogName || '未選択'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">部屋</span>
            <span className="font-medium">{selectedRoomName || '未選択'}</span>
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

export default HotelReservationCreate
