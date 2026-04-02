import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { getRecordLabel } from '../domain/businessTypeConfig'
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
import { useTrialStepCompletion } from '../hooks/useTrialStepCompletion'
import { TrialPageGuide } from '../components/trial/TrialPageGuide'
import RecordTypeSection from './records/components/RecordTypeSection'
import HotelForm from './records/components/HotelForm'
import RecordReportComposer from './records/components/RecordReportComposer'
import RecordSaveFooter from './records/components/RecordSaveFooter'
import { useRecordFormState } from './records/hooks/useRecordFormState'
import { useAISettings } from './records/hooks/useAISettings'
import { useRecordAISuggestions } from './records/hooks/useRecordAISuggestions'
import { calculateAge } from '../utils/dog'
import { LazyImage } from '../components/LazyImage'
import { getListThumbnailUrl } from '../utils/image'
import { useRecordCreateAnalytics } from './records/hooks/useRecordCreateAnalytics'
import { useRecordReservationSource } from './records/hooks/useRecordReservationSource'
import { useCopyPreviousRecord } from './records/hooks/useCopyPreviousRecord'
import { useRecordCreateActions } from './records/hooks/useRecordCreateActions'

interface Dog {
  id: number
  name: string
  breed: string
  birth_date: string
  photo_url: string | null
  owner_name: string
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
  const { selectedBusinessType, effectiveBusinessType } = useBusinessTypeFilter()
  const activeBusinessType = (selectedBusinessType || effectiveBusinessType || 'daycare') as RecordType
  const recordLabel = getRecordLabel(activeBusinessType)
  const [recordSaved, setRecordSaved] = useState(false)

  // トライアルガイド: 連絡帳保存完了で Step 6 自動完了
  useTrialStepCompletion('write_record', recordSaved)
  const storeId = useAuthStore((s) => s.user?.storeId ?? 0)
  const { finishSession, trackRecordEvent } = useRecordCreateAnalytics({ reservationId, storeId })

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
  const [collapsed, setCollapsed] = useState({ condition: true, health: true, careLogs: true })
  const recordMainSectionRef = useRef<HTMLDivElement>(null)
  const photosSectionRef = useRef<HTMLDivElement>(null)
  const conditionSectionRef = useRef<HTMLDivElement>(null)
  const healthSectionRef = useRef<HTMLDivElement>(null)
  const hotelStaySectionRef = useRef<HTMLDivElement>(null)
  const hotelCareSectionRef = useRef<HTMLDivElement>(null)
  const reportSectionRef = useRef<HTMLDivElement>(null)
  const internalMemoSectionRef = useRef<HTMLDivElement>(null)

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

  const {
    reservationSourceError,
    waitingReservationSource,
  } = useRecordReservationSource({
    reservationId,
    activeBusinessType,
    setSelectedDogId,
    setHotelData,
  })

  const {
    copyLoading: isCopyLoading,
    handleCopyPrevious,
  } = useCopyPreviousRecord({
    selectedDogId,
    recordType,
    recordLabel,
    showToast,
    setDaycareData,
    setGroomingData,
    setHotelData,
    setCondition,
    setHealthCheck,
  })

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

  const {
    saving,
    selectedReportTone,
    setSelectedReportTone,
    handleSave,
    handleShare,
    handleGenerateReport,
    handlePhotoAdded,
  } = useRecordCreateActions({
    selectedDogId,
    reservationId,
    recordType,
    recordLabel,
    aiAssistantEnabled: aiSettings.aiAssistantEnabled,
    daycareData,
    groomingData,
    hotelData,
    photos,
    notes,
    condition,
    healthCheck,
    navigate,
    showToast,
    confirm,
    finishSession,
    trackRecordEvent,
    sendAIFeedback,
    analyzePhotoConcern,
    onToneChange: setReportTone,
    onGenerateReportSuggestion: (tone) => handleAISuggestionAction('report-draft', undefined, {
      regenerate: true,
      tone,
    }),
    onRecordSaved: () => setRecordSaved(true),
  })

  return (
    <div className="min-h-screen bg-background pb-56">
      <RecordHeader
        petName={selectedDog?.name}
        recordType={recordType}
        onSettings={openAISettings}
      />

      <div className="px-4 pt-4">
        <TrialPageGuide
          stepKey="write_record"
          title="連絡帳を書いてみましょう"
          detail="ワンちゃんの今日の様子を書いてみましょう。ごはん・お散歩・気になったことなど、自由にお書きください。&#10;&#10;💡 このステップでは「保存」ボタンで保存だけしてください。LINEへの送信はステップ4のLINE設定後に行います。"
        />
      </div>

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
            copyLoading={isCopyLoading}
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
