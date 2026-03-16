import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { getRecordLabel } from '../utils/businessTypeColors'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import { useAuthStore } from '../store/authStore'
import type { RecordType } from '../types/record'
import RecordHeader from './records/components/RecordHeader'
import PetInfoCard from './records/components/PetInfoCard'
import RequiredSection from './records/components/RequiredSection'
import OptionalSection from './records/components/OptionalSection'
import PhotosForm from './records/components/PhotosForm'
import ConditionForm from './records/components/ConditionForm'
import HealthCheckForm from './records/components/HealthCheckForm'
import AISettingsScreen from './records/components/AISettingsScreen'
import RecordTypeSection from './records/components/RecordTypeSection'
import HotelForm from './records/components/HotelForm'
import RecordReportComposer from './records/components/RecordReportComposer'
import RecordSaveFooter from './records/components/RecordSaveFooter'
import { useRecordFormState } from './records/hooks/useRecordFormState'
import { useRecordEditorCore } from './records/hooks/useRecordEditorCore'
import { buildCreateRecordPayload, validateRecordForm } from './records/utils/recordForm'
import { useAISettings } from './records/hooks/useAISettings'
import { useRecordAISuggestions } from './records/hooks/useRecordAISuggestions'
import { calculateAge } from '../utils/dog'
import { LazyImage } from '../components/LazyImage'
import { getListThumbnailUrl } from '../utils/image'
import { endUxSession, getUxIdentity, startUxSession, trackUxEvent } from '../lib/uxAnalytics'

interface Dog {
  id: number
  name: string
  breed: string
  birth_date: string
  photo_url: string | null
  owner_name: string
}

interface ReservationSource {
  dog_id?: number
  service_type?: RecordType
  reservation_date?: string
  reservation_time?: string | null
  end_datetime?: string | null
  service_details?: {
    special_care?: string
  } | null
  memo?: string | null
  notes?: string | null
}

function formatToDatetimeLocal(value?: string | null): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function combineDateAndTime(date?: string, time?: string | null): string {
  if (!date) return ''
  const timeValue = time && /^\d{2}:\d{2}$/.test(time) ? time : '00:00'
  return `${date}T${timeValue}`
}

const CONDITION_SUMMARY: Record<string, string> = {
  excellent: '😆 絶好調',
  good: '😊 元気',
  normal: '😐 普通',
  tired: '😴 疲れ気味',
  observe: '🤒 要観察',
}

const HOTEL_CARE_LOG_SUMMARY: Record<string, string> = {
  feeding: '食事',
  medication: '投薬',
  toilet: '排泄',
  walk: '散歩',
}

const RecordCreate = () => {
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()
  const uxSessionIdRef = useRef<string>(startUxSession('record'))
  const sessionEndedRef = useRef(false)
  const isCreatingFromReservation = Boolean(reservationId)
  const { selectedBusinessType, effectiveBusinessType } = useBusinessTypeFilter()
  const activeBusinessType = (selectedBusinessType || effectiveBusinessType || 'daycare') as RecordType
  const recordLabel = getRecordLabel(activeBusinessType)
  const storeId = useAuthStore((s) => s.user?.storeId ?? 0)

  const finishSession = useCallback((result: 'success' | 'drop' | 'error', step = 'record_submit') => {
    if (sessionEndedRef.current) return
    sessionEndedRef.current = true
    endUxSession({
      flow: 'record',
      sessionId: uxSessionIdRef.current,
      result,
      step,
    })
  }, [])

  const trackRecordEvent = useCallback((
    eventName: 'route_view' | 'cta_click' | 'form_error' | 'submit_success' | 'submit_fail' | 'api_slow',
    step: string,
    meta?: Record<string, string | number | boolean>,
  ) => {
    const identity = getUxIdentity()
    trackUxEvent({
      eventName,
      flow: 'record',
      step,
      sessionId: uxSessionIdRef.current,
      path: window.location.pathname,
      storeId: identity.storeId || storeId,
      staffIdHash: identity.staffIdHash,
      timestamp: new Date().toISOString(),
      meta,
    })
  }, [storeId])

  // Dog selection
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null)
  const [recordType, setRecordType] = useState<RecordType>(activeBusinessType)

  // 業種固定：現在選択業種にrecordTypeを常時同期
  useEffect(() => {
    setRecordType(activeBusinessType)
  }, [activeBusinessType])

  const {
    daycareData,
    setDaycareData,
    groomingData,
    setGroomingData,
    hotelData,
    setHotelData,
    photos,
    setPhotos,
    notes,
    setNotes,
    condition,
    setCondition,
    healthCheck,
    setHealthCheck,
  } = useRecordFormState()

  // UI state
  const [copyLoading, setCopyLoading] = useState(false)
  const [collapsed, setCollapsed] = useState({ condition: true, health: true, careLogs: true })
  const [reservationLookupDone, setReservationLookupDone] = useState(!isCreatingFromReservation)
  const recordMainSectionRef = useRef<HTMLDivElement>(null)
  const photosSectionRef = useRef<HTMLDivElement>(null)
  const conditionSectionRef = useRef<HTMLDivElement>(null)
  const healthSectionRef = useRef<HTMLDivElement>(null)
  const hotelStaySectionRef = useRef<HTMLDivElement>(null)
  const hotelCareSectionRef = useRef<HTMLDivElement>(null)
  const reportSectionRef = useRef<HTMLDivElement>(null)
  const internalMemoSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setReservationLookupDone(!isCreatingFromReservation)
  }, [isCreatingFromReservation, reservationId])

  // Fetch dogs list
  const { data: dogs = [] } = useSWR<Dog[]>('/dogs?limit=200', fetcher)
  const selectedDogFromList = dogs.find((d) => d.id === selectedDogId)
  const {
    data: selectedDogFallback,
    isLoading: loadingSelectedDogFallback,
  } = useSWR<Dog>(
    selectedDogId && !selectedDogFromList ? `/dogs/${selectedDogId}` : null,
    fetcher
  )
  const selectedDog = selectedDogFromList || selectedDogFallback

  const {
    aiSettings,
    showAISettings,
    openAISettings,
    closeAISettings,
    saveAISettings,
  } = useAISettings()

  // Fetch reservation data if creating from reservation
  const {
    error: reservationSourceError,
  } = useSWR<ReservationSource>(
    reservationId ? `/reservations/${reservationId}` : null,
    fetcher,
    {
      onSuccess: (data: ReservationSource) => {
        if (typeof data?.dog_id === 'number' && data.dog_id > 0) {
          setSelectedDogId(data.dog_id)
        }
        // ホテルカルテの自動入力
        if (data?.service_type === 'hotel' && activeBusinessType === 'hotel') {
          setHotelData((prev) => {
            if (prev.check_in || prev.check_out_scheduled) return prev

            const checkIn = formatToDatetimeLocal(combineDateAndTime(data.reservation_date, data.reservation_time))
            const checkOut = formatToDatetimeLocal(data.end_datetime)
            const diffMs = checkIn && checkOut
              ? new Date(checkOut).getTime() - new Date(checkIn).getTime()
              : 0
            const computedNights = diffMs > 0 ? Math.ceil(diffMs / 86_400_000) : 1

            return {
              ...prev,
              check_in: checkIn,
              check_out_scheduled: checkOut,
              nights: Math.max(1, computedNights),
              special_care: data.service_details?.special_care || data.memo || data.notes || prev.special_care || '',
            }
          })
        }
        setReservationLookupDone(true)
      },
      onError: () => {
        setReservationLookupDone(true)
      },
    }
  )
  const waitingReservationSource = isCreatingFromReservation && !reservationLookupDone

  const handleCopyPrevious = useCallback(async () => {
    if (!selectedDogId) return
    setCopyLoading(true)
    try {
      const res = await recordsApi.getLatest(selectedDogId, recordType)
      const prev = res.data
      if (prev.daycare_data) setDaycareData(prev.daycare_data)
      if (prev.grooming_data) setGroomingData(prev.grooming_data)
      if (prev.hotel_data) setHotelData(prev.hotel_data)
      if (prev.condition) setCondition(prev.condition)
      if (prev.health_check) setHealthCheck(prev.health_check)
      showToast('前回のデータをコピーしました', 'success')
    } catch {
      showToast(`前回の${recordLabel}がありません`, 'info')
    } finally {
      setCopyLoading(false)
    }
  }, [selectedDogId, recordType, showToast])

  useEffect(() => {
    trackRecordEvent('route_view', reservationId ? 'record_create_from_reservation' : 'record_create')

    return () => {
      finishSession('drop', 'record_abandon')
    }
  }, [finishSession, reservationId, trackRecordEvent])

  const aiContext = useMemo(() => ({
    recordType,
    dogName: selectedDog?.name,
    daycareData,
    groomingData,
    hotelData,
    photos,
    notes,
    condition,
    healthCheck,
  }), [recordType, selectedDog?.name, daycareData, groomingData, hotelData, photos, notes, condition, healthCheck])

  const {
    aiSuggestions: recordAISuggestions,
    setReportTone,
    handleAISuggestionAction,
    handleAISuggestionDismiss,
    analyzePhotoConcern,
    sendAIFeedback,
  } = useRecordAISuggestions({
    aiEnabled: aiSettings.aiAssistantEnabled,
    context: aiContext,
    setPhotos,
    setNotes,
    onReportDraftError: () => showToast('報告文の生成に失敗しました', 'error'),
  })

  const reportSuggestion = aiSettings.aiAssistantEnabled ? recordAISuggestions['report-draft'] : null
  const conditionSummary = condition?.overall
    ? CONDITION_SUMMARY[condition.overall] || '入力あり'
    : '未入力'
  const healthSummaryCount = healthCheck
    ? Object.values(healthCheck).filter((v) => v !== undefined && v !== null && v !== '').length
    : 0
  const healthSummary = healthSummaryCount > 0 ? `${healthSummaryCount}項目入力済み` : '未入力'
  const hotelCareLogCount = hotelData.care_logs?.length || 0
  const latestHotelCare = hotelCareLogCount > 0
    ? HOTEL_CARE_LOG_SUMMARY[hotelData.care_logs![hotelCareLogCount - 1]?.category || ''] || '記録あり'
    : ''
  const hotelCareSummary = hotelCareLogCount > 0
    ? `${hotelCareLogCount}件${latestHotelCare ? ` / 最新: ${latestHotelCare}` : ''}`
    : '未入力'

  const validateEditor = useCallback((mode: 'save' | 'share') => {
    if (!selectedDogId) {
      return { ok: false, errors: ['ワンちゃんを選択してください'] }
    }
    return validateRecordForm({
      recordType,
      groomingData,
      daycareData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    }, mode)
  }, [selectedDogId, recordType, groomingData, daycareData, hotelData, photos, notes, condition, healthCheck])

  const createRecord = useCallback(async (shareAfter: boolean) => {
    if (!selectedDogId) return

    const formData = buildCreateRecordPayload({
      dogId: selectedDogId,
      reservationId,
      recordType,
      status: shareAfter ? 'shared' : 'saved',
      daycareData,
      groomingData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    })

    const res = await recordsApi.create(formData)
    const recordId = res.data.id

    trackRecordEvent('submit_success', shareAfter ? 'record_share_submit' : 'record_save_submit', {
      share_after: shareAfter,
    })
    finishSession('success', shareAfter ? 'record_share_submit' : 'record_save_submit')

    if (shareAfter) {
      await recordsApi.share(recordId)
      showToast(`${recordLabel}を共有しました`, 'success')
    } else {
      showToast(`${recordLabel}を保存しました`, 'success')
    }
    await sendAIFeedback(notes.report_text)
    navigate(`/records/${recordId}`, { replace: true })
  }, [
    condition,
    daycareData,
    groomingData,
    healthCheck,
    hotelData,
    navigate,
    notes,
    photos,
    recordLabel,
    recordType,
    reservationId,
    selectedDogId,
    sendAIFeedback,
    finishSession,
    showToast,
    trackRecordEvent,
  ])

  const handlePhotoAdded = async (photoUrl: string, type: 'regular' | 'concern') => {
    if (!aiSettings.aiAssistantEnabled || recordType !== 'grooming' || type !== 'regular') return
    await analyzePhotoConcern(photoUrl)
  }

  const {
    saving,
    reportTone: selectedReportTone,
    setReportTone: setSelectedReportTone,
    handleSave,
    handleShare,
    handleGenerateReport,
  } = useRecordEditorCore({
    validate: validateEditor,
    onValidationError: (message) => {
      trackRecordEvent('form_error', 'record_validation_error')
      showToast(message, 'error')
    },
    onSave: () => {
      trackRecordEvent('cta_click', 'record_save_click', { mode: 'save' })
      return createRecord(false)
    },
    onShare: () => {
      trackRecordEvent('cta_click', 'record_share_click', { mode: 'share' })
      return createRecord(true)
    },
    onSaveError: () => {
      trackRecordEvent('submit_fail', 'record_save_submit', { mode: 'save' })
      showToast('保存に失敗しました', 'error')
    },
    onShareError: () => {
      trackRecordEvent('submit_fail', 'record_share_submit', { mode: 'share' })
      showToast('保存に失敗しました', 'error')
    },
    confirmShare: () => confirm({
      title: '送信確認',
      message: '飼い主に送信しますか？',
      confirmLabel: '送信',
      cancelLabel: 'キャンセル',
      variant: 'default',
    }),
    validateShareBeforeConfirm: false,
    onToneChange: setReportTone,
    onGenerateReport: (tone) => handleAISuggestionAction('report-draft', undefined, {
      regenerate: true,
      tone,
    }),
  })

  return (
    <div className="min-h-screen bg-background pb-56">
      <RecordHeader
        petName={selectedDog?.name}
        recordType={recordType}
        onSettings={openAISettings}
      />

      {waitingReservationSource && (
        <div className="mx-4 mt-4 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
          予約情報を読み込み中です...
        </div>
      )}

      {/* Dog Selection */}
      {!selectedDogId && !waitingReservationSource && (
        <div className="mx-4 mt-4">
          <h3 className="text-sm font-bold text-foreground mb-2">ワンちゃんを選択</h3>
          {reservationSourceError && (
            <p className="mb-2 text-xs text-destructive">予約情報の取得に失敗したため、ワンちゃんを手動で選択してください。</p>
          )}
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            {dogs.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">登録されたワンちゃんがいません</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {dogs.map((dog) => (
                  <button
                    key={dog.id}
                    onClick={() => setSelectedDogId(dog.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-background active:scale-[0.98] transition-all text-left"
                  >
                    {dog.photo_url ? (
                      <LazyImage
                        src={getListThumbnailUrl(dog.photo_url)}
                        alt={dog.name}
                        className="size-10 rounded-full"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground">{dog.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold">{dog.name}</p>
                      <p className="text-xs text-muted-foreground">{dog.breed}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDogId && !selectedDog && (
        <div className="mx-4 mt-4 rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
          {loadingSelectedDogFallback ? 'ワンちゃん情報を読み込み中です...' : 'ワンちゃん情報を取得できませんでした。'}
        </div>
      )}

      {selectedDogId && selectedDog && (
        <>
          <PetInfoCard
            petName={selectedDog.name}
            breed={selectedDog.breed}
            age={selectedDog.birth_date ? calculateAge(selectedDog.birth_date) : undefined}
            photoUrl={selectedDog.photo_url}
            recordType={recordType}
            onCopyPrevious={handleCopyPrevious}
            copyLoading={copyLoading}
          />

          <p className="mx-4 mt-3 text-xs text-muted-foreground">
            来店中に下書き入力し、来店後に最終確認して保存/送信してください。
          </p>

          <div ref={photosSectionRef}>
            <RequiredSection title="写真" completed={(photos.regular || []).length > 0}>
              <PhotosForm
                data={photos}
                onChange={setPhotos}
                recordType={recordType}
                showConcerns={recordType === 'grooming'}
                aiSuggestion={recordAISuggestions['photo-concern']}
                onAISuggestionAction={(editedText) => handleAISuggestionAction('photo-concern', editedText)}
                onAISuggestionDismiss={() => handleAISuggestionDismiss('photo-concern')}
                onPhotoAdded={handlePhotoAdded}
              />
            </RequiredSection>
          </div>

          <div ref={recordMainSectionRef}>
            {recordType === 'hotel' ? (
              <div ref={hotelStaySectionRef}>
                <RequiredSection title="宿泊情報" completed={!!(hotelData.check_in && hotelData.check_out_scheduled)}>
                  <HotelForm
                    data={hotelData}
                    onChange={setHotelData}
                    mode="stay"
                  />
                </RequiredSection>
              </div>
            ) : (
              <RecordTypeSection
                recordType={recordType}
                daycareData={daycareData}
                groomingData={groomingData}
                hotelData={hotelData}
                onDaycareChange={setDaycareData}
                onGroomingChange={setGroomingData}
                onHotelChange={setHotelData}
                storeId={storeId}
              />
            )}
          </div>

          {recordType === 'hotel' && (
            <div ref={hotelCareSectionRef}>
              <OptionalSection
                title="滞在ログ"
                collapsed={collapsed.careLogs}
                summary={hotelCareSummary}
                onToggle={() => setCollapsed((s) => ({ ...s, careLogs: !s.careLogs }))}
              >
                <HotelForm
                  data={hotelData}
                  onChange={setHotelData}
                  mode="careLogs"
                />
              </OptionalSection>
            </div>
          )}

          <div ref={conditionSectionRef}>
            <OptionalSection
              title="体調・様子"
              collapsed={collapsed.condition}
              summary={conditionSummary}
              onToggle={() => setCollapsed((s) => ({ ...s, condition: !s.condition }))}
            >
              <ConditionForm data={condition} onChange={setCondition} />
            </OptionalSection>
          </div>

          <div ref={healthSectionRef}>
            <OptionalSection
              title="健康チェック"
              collapsed={collapsed.health}
              summary={healthSummary}
              onToggle={() => setCollapsed((s) => ({ ...s, health: !s.health }))}
            >
              <HealthCheckForm
                data={healthCheck}
                onChange={setHealthCheck}
                showWeightGraph={recordType === 'grooming'}
                weightHistory={[]}
                aiSuggestion={recordAISuggestions['health-history']}
                onAISuggestionAction={(editedText) => handleAISuggestionAction('health-history', editedText)}
                onAISuggestionDismiss={() => handleAISuggestionDismiss('health-history')}
              />
            </OptionalSection>
          </div>

          <RecordReportComposer
            mode="create"
            notes={notes}
            onNotesChange={setNotes}
            aiEnabled={aiSettings.aiAssistantEnabled}
            reportSuggestion={reportSuggestion}
            selectedReportTone={selectedReportTone}
            reportSectionRef={reportSectionRef}
            internalMemoSectionRef={internalMemoSectionRef}
            onGenerateReport={handleGenerateReport}
            onToneSelect={setSelectedReportTone}
            onAISuggestionAction={(editedText) => handleAISuggestionAction('report-draft', editedText)}
            onAISuggestionDismiss={() => handleAISuggestionDismiss('report-draft')}
          />

          <RecordSaveFooter
            mode="create"
            recordType={recordType}
            saving={saving}
            onSave={handleSave}
            onShare={handleShare}
            shareLabel="保存して送信"
          />
        </>
      )}

      <AISettingsScreen
        open={showAISettings}
        onClose={closeAISettings}
        initialSettings={aiSettings}
        onSave={async (settings) => {
          const result = await saveAISettings(settings)
          if (result.ok) {
            showToast('AI設定を保存しました', 'success')
          } else {
            showToast('AI設定の保存に失敗しました', 'error')
          }
        }}
      />

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  )
}

export default RecordCreate
