import { useEffect, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useReservationCreateData } from '../hooks/useReservationCreateData'
import { useReservationCreate } from '../hooks/useReservationCreate'
import { useDogFilter } from '../hooks/useDogFilter'
import { endUxSession, getUxIdentity, startUxSession, trackUxEvent } from '../lib/uxAnalytics'
import { useTrialStepCompletion } from '../hooks/useTrialStepCompletion'
import StepIndicator from '../components/reservations/StepIndicator'
import DogSelectStep from '../components/reservations/DogSelectStep'
import DateTimeStep from '../components/reservations/DateTimeStep'
import ReservationDetailsStep from '../components/reservations/ReservationDetailsStep'
import ReservationFooter from '../components/reservations/ReservationFooter'

const ReservationCreate = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const uxSessionIdRef = useRef<string>(startUxSession('reservation'))
  const sessionEndedRef = useRef(false)

  const finishSession = (result: 'success' | 'drop' | 'error') => {
    if (sessionEndedRef.current) return
    sessionEndedRef.current = true
    endUxSession({
      flow: 'reservation',
      sessionId: uxSessionIdRef.current,
      result,
      step: 'reservation_create',
    })
  }

  const { loading, dogs, recentReservations, invalidate } = useReservationCreateData()
  const [searchQuery, setSearchQuery] = useState('')
  const [showRecentOnly, setShowRecentOnly] = useState(false)
  const [reservationSaved, setReservationSaved] = useState(false)

  // トライアルガイド: 予約作成完了で Step 3 自動完了
  useTrialStepCompletion('create_reservation', reservationSaved)

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
      setReservationSaved(true)
      invalidate()
      navigate('/reservations')
    },
    uxSessionId: uxSessionIdRef.current,
    onSessionEnd: (result) => finishSession(result),
  })

  const { filteredDogs, recentDogs } = useDogFilter({
    dogs,
    recentReservations,
    searchQuery,
  })

  const selectedDog = dogs.find((d) => d.id === selectedDogId)

  useEffect(() => {
    const { storeId, staffIdHash } = getUxIdentity()
    trackUxEvent({
      eventName: 'route_view',
      flow: 'reservation',
      step: 'reservation_create',
      sessionId: uxSessionIdRef.current,
      path: window.location.pathname,
      storeId,
      staffIdHash,
      timestamp: new Date().toISOString(),
    })

    return () => {
      finishSession('drop')
    }
  }, [])

  const trackStepMove = (nextStep: 1 | 2 | 3, action: 'step_change' | 'next' | 'back') => {
    const { storeId, staffIdHash } = getUxIdentity()
    trackUxEvent({
      eventName: 'cta_click',
      flow: 'reservation',
      step: `reservation_step_${nextStep}`,
      sessionId: uxSessionIdRef.current,
      path: window.location.pathname,
      storeId,
      staffIdHash,
      timestamp: new Date().toISOString(),
      meta: {
        action,
      },
    })
  }

  const moveStep = (nextStep: 1 | 2 | 3, action: 'step_change' | 'next' | 'back') => {
    trackStepMove(nextStep, action)
    setCurrentStep(nextStep)
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
          <h1 className="text-lg font-bold font-heading">予約登録</h1>
        </div>
      </header>

      <StepIndicator
        currentStep={currentStep}
        canGoToStep2={Boolean(form.reservation_date && form.reservation_time)}
        canGoToStep3={Boolean(selectedDogId)}
        onStepChange={(step) => moveStep(step, 'step_change')}
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* ステップ1: 日付選択 */}
        {currentStep === 1 && (
          <DateTimeStep
            form={form}
            onChange={handleChange}
            onNext={() => moveStep(2, 'next')}
          />
        )}

        {/* ステップ2: 犬を選択 */}
        {currentStep === 2 && (
          <DogSelectStep
            title="登園するワンちゃん"
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
            onBack={() => moveStep(1, 'back')}
            onNext={() => moveStep(3, 'next')}
          />
        )}

        {/* ステップ3: 予約タイプと確認 */}
        {currentStep === 3 && (
          <ReservationDetailsStep
            form={form}
            selectedDogName={selectedDog?.name || ''}
            onChange={handleChange}
            onBack={() => moveStep(2, 'back')}
          />
        )}
      </form>

      {currentStep === 3 && (
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
      )}
    </div>
  )
}

export default ReservationCreate
