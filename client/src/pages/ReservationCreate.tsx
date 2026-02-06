import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReservationCreateData } from '../hooks/useReservationCreateData'
import { useReservationCreate } from '../hooks/useReservationCreate'
import { useDogFilter } from '../hooks/useDogFilter'
import StepIndicator from '../components/reservations/StepIndicator'
import DogSelectStep from '../components/reservations/DogSelectStep'
import DateTimeStep from '../components/reservations/DateTimeStep'
import ReservationDetailsStep from '../components/reservations/ReservationDetailsStep'
import ReservationFooter from '../components/reservations/ReservationFooter'

const ReservationCreate = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')

  const { loading, dogs, recentReservations, invalidate } = useReservationCreateData()
  const [searchQuery, setSearchQuery] = useState('')
  const [showRecentOnly, setShowRecentOnly] = useState(false)

  const {
    form,
    saving,
    currentStep,
    setCurrentStep,
    selectedDogId,
    setSelectedDogId,
    handleChange,
    handleSubmit,
  } = useReservationCreate({
    dateParam,
    onSuccess: () => {
      invalidate()
      navigate('/reservations')
    },
  })

  const { filteredDogs, recentDogs } = useDogFilter({
    dogs,
    recentReservations,
    searchQuery,
  })

  const selectedDog = dogs.find((d) => d.id === selectedDogId)

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
          <h1 className="text-lg font-bold font-heading">予約登録</h1>
        </div>
      </header>

      <StepIndicator
        currentStep={currentStep}
        canGoToStep2={Boolean(form.reservation_date && form.reservation_time)}
        canGoToStep3={Boolean(selectedDogId)}
        onStepChange={setCurrentStep}
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* ステップ1: 日付選択 */}
        {currentStep === 1 && (
          <DateTimeStep
            form={form}
            onChange={handleChange}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {/* ステップ2: 犬を選択 */}
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

        {/* ステップ3: 予約タイプと確認 */}
        {currentStep === 3 && (
          <ReservationDetailsStep
            form={form}
            selectedDogName={selectedDog?.name || ''}
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
        pickupTime={form.pickup_time}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

export default ReservationCreate
