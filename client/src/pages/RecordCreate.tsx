import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import { useToast } from '../components/Toast'
import { getRecordLabel } from '../utils/businessTypeColors'
import { useBusinessTypeFilter } from '../hooks/useBusinessTypeFilter'
import type { RecordType } from '../types/record'
import RecordHeader from './records/components/RecordHeader'
import PetInfoCard from './records/components/PetInfoCard'
import RequiredSection from './records/components/RequiredSection'
import OptionalSection from './records/components/OptionalSection'
import PhotosForm from './records/components/PhotosForm'
import NotesForm from './records/components/NotesForm'
import ConditionForm from './records/components/ConditionForm'
import HealthCheckForm from './records/components/HealthCheckForm'
import AISettingsScreen from './records/components/AISettingsScreen'
import RecordTypeSection from './records/components/RecordTypeSection'
import { useRecordFormState } from './records/hooks/useRecordFormState'
import { buildCreateRecordPayload, validateRecordForm } from './records/utils/recordForm'
import { useAISettings } from './records/hooks/useAISettings'
import { useRecordAISuggestions } from './records/hooks/useRecordAISuggestions'
import { calculateAge } from '../utils/dog'

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

const RecordCreate = () => {
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const { showToast } = useToast()
  const isCreatingFromReservation = Boolean(reservationId)
  const { selectedBusinessType, effectiveBusinessType } = useBusinessTypeFilter()
  const activeBusinessType = (selectedBusinessType || effectiveBusinessType || 'daycare') as RecordType
  const recordLabel = getRecordLabel(activeBusinessType)

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
  const [saving, setSaving] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [collapsed, setCollapsed] = useState({ condition: true, health: true })
  const [activeTab, setActiveTab] = useState<'record' | 'report'>('record')

  // Fetch dogs list
  const { data: dogs = [] } = useSWR<Dog[]>('/dogs?limit=200', fetcher)
  const selectedDogFromList = dogs.find((d) => d.id === selectedDogId)
  const {
    data: selectedDogFallback,
    isLoading: loadingSelectedDogFallback,
  } = useSWR<Dog>(
    selectedDogId && !selectedDogFromList ? `/dogs/${selectedDogId}` : null,
    fetcher,
    { revalidateOnFocus: false }
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
    isLoading: loadingReservationSource,
    error: reservationSourceError,
  } = useSWR<ReservationSource>(
    reservationId ? `/reservations/${reservationId}` : null,
    fetcher,
    {
      onSuccess: (data: ReservationSource) => {
        if (data?.dog_id) {
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
      },
    }
  )
  const waitingReservationSource = isCreatingFromReservation && loadingReservationSource && !selectedDogId

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
    reportInputTrace,
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

  const handleSave = async (shareAfter = false) => {
    if (!selectedDogId) {
      showToast('ワンちゃんを選択してください', 'error')
      return
    }

    const validation = validateRecordForm({
      recordType,
      groomingData,
      daycareData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    }, shareAfter ? 'share' : 'save')

    if (!validation.ok) {
      showToast(validation.errors[0], 'error')
      return
    }

    setSaving(true)
    try {
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

      if (shareAfter) {
        await recordsApi.share(recordId)
        showToast(`${recordLabel}を共有しました`, 'success')
      } else {
        showToast(`${recordLabel}を保存しました`, 'success')
      }
      await sendAIFeedback(notes.report_text)

      navigate(`/records/${recordId}`, { replace: true })
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = () => {
    if (confirm('飼い主に送信しますか？')) {
      handleSave(true)
    }
  }

  const handlePhotoAdded = async (photoUrl: string, type: 'regular' | 'concern') => {
    if (!aiSettings.aiAssistantEnabled || recordType !== 'grooming' || type !== 'regular') return
    await analyzePhotoConcern(photoUrl)
  }

  const handleJumpToField = (fieldKey: string) => {
    setActiveTab('record')
    if (fieldKey === 'condition') {
      setCollapsed((s) => ({ ...s, condition: false }))
    }
    if (fieldKey === 'health_check') {
      setCollapsed((s) => ({ ...s, health: false }))
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <RecordHeader
        petName={selectedDog?.name}
        recordType={recordType}
        saving={saving}
        onSave={() => handleSave(false)}
        onShare={handleShare}
        onSettings={openAISettings}
        shareLabel="保存して送信"
      />

      {waitingReservationSource && (
        <div className="mx-4 mt-4 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
          予約情報を読み込み中です...
        </div>
      )}

      {/* Dog Selection */}
      {!selectedDogId && !waitingReservationSource && (
        <div className="mx-4 mt-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">ワンちゃんを選択</h3>
          {reservationSourceError && (
            <p className="mb-2 text-xs text-destructive">予約情報の取得に失敗したため、ワンちゃんを手動で選択してください。</p>
          )}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {dogs.length === 0 ? (
              <p className="p-4 text-sm text-slate-400 text-center">登録されたワンちゃんがいません</p>
            ) : (
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {dogs.map((dog) => (
                  <button
                    key={dog.id}
                    onClick={() => setSelectedDogId(dog.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    {dog.photo_url ? (
                      <img src={dog.photo_url} alt={dog.name} className="size-10 rounded-full object-cover" />
                    ) : (
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-sm font-bold text-muted-foreground">{dog.name.charAt(0)}</span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold">{dog.name}</p>
                      <p className="text-xs text-slate-400">{dog.breed}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDogId && !selectedDog && (
        <div className="mx-4 mt-4 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-500">
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

          <div className="mx-4 mt-4">
            <div className="flex bg-muted rounded-xl p-1">
              <button
                type="button"
                onClick={() => setActiveTab('record')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  activeTab === 'record' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
                aria-pressed={activeTab === 'record'}
              >
                記録
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${
                  activeTab === 'report' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
                aria-pressed={activeTab === 'report'}
              >
                報告
              </button>
            </div>
          </div>

          <p className="mx-4 mt-3 text-xs text-muted-foreground">
            来店中に下書き入力し、来店後に最終確認して保存/送信してください。
          </p>

          {activeTab === 'record' && (
            <>
              {/* Business-type specific form */}
              <RecordTypeSection
                recordType={recordType}
                daycareData={daycareData}
                groomingData={groomingData}
                hotelData={hotelData}
                onDaycareChange={setDaycareData}
                onGroomingChange={setGroomingData}
                onHotelChange={setHotelData}
              />

              <RequiredSection title="写真">
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

              <OptionalSection
                title="体調・様子"
                collapsed={collapsed.condition}
                onToggle={() => setCollapsed((s) => ({ ...s, condition: !s.condition }))}
              >
                <ConditionForm data={condition} onChange={setCondition} />
              </OptionalSection>

              <OptionalSection
                title="健康チェック"
                collapsed={collapsed.health}
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
            </>
          )}

          {activeTab === 'report' && (
            <RequiredSection title="報告文">
              <NotesForm
                data={notes}
                onChange={setNotes}
                aiSuggestion={recordAISuggestions['report-draft']}
                inputTrace={aiSettings.aiAssistantEnabled ? reportInputTrace : []}
                generatedFrom={aiSettings.aiAssistantEnabled ? (recordAISuggestions['report-draft']?.generated_from || []) : []}
                onRegenerate={() => handleAISuggestionAction('report-draft', undefined, { regenerate: true })}
                onToneChange={(tone) => {
                  setReportTone(tone)
                  handleAISuggestionAction('report-draft', undefined, { regenerate: true, tone })
                }}
                onJumpToField={handleJumpToField}
                onAISuggestionAction={(editedText) => handleAISuggestionAction('report-draft', editedText)}
                onAISuggestionDismiss={() => handleAISuggestionDismiss('report-draft')}
              />
            </RequiredSection>
          )}
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
    </div>
  )
}

export default RecordCreate
