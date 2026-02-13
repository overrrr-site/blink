import { useState, useCallback, useMemo, useEffect, useRef, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'
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
import { useRecordFormState } from './records/hooks/useRecordFormState'
import { buildCreateRecordPayload, validateRecordForm } from './records/utils/recordForm'
import { useAISettings } from './records/hooks/useAISettings'
import { useRecordAISuggestions } from './records/hooks/useRecordAISuggestions'
import { calculateAge } from '../utils/dog'
import { BTN_PRIMARY, BTN_SECONDARY } from '../utils/styles'
import { getBusinessTypeColors } from '../utils/businessTypeColors'

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
  const isCreatingFromReservation = Boolean(reservationId)
  const { selectedBusinessType, effectiveBusinessType } = useBusinessTypeFilter()
  const activeBusinessType = (selectedBusinessType || effectiveBusinessType || 'daycare') as RecordType
  const recordLabel = getRecordLabel(activeBusinessType)
  const storeId = useAuthStore((s) => s.user?.storeId ?? 0)

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
  const [selectedReportTone, setSelectedReportTone] = useState<'formal' | 'casual'>('formal')
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

  const reportSuggestion = aiSettings.aiAssistantEnabled ? recordAISuggestions['report-draft'] : null
  const missingInputCount = reportInputTrace.filter((item) => item.status === 'missing').length
  const firstMissingField = reportInputTrace.find((item) => item.status === 'missing')?.key
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

  const handleShare = async () => {
    const ok = await confirm({
      title: '送信確認',
      message: '飼い主に送信しますか？',
      confirmLabel: '送信',
      cancelLabel: 'キャンセル',
      variant: 'default',
    })
    if (ok) {
      handleSave(true)
    }
  }

  const handlePhotoAdded = async (photoUrl: string, type: 'regular' | 'concern') => {
    if (!aiSettings.aiAssistantEnabled || recordType !== 'grooming' || type !== 'regular') return
    await analyzePhotoConcern(photoUrl)
  }

  const scrollToSection = (ref: RefObject<HTMLDivElement>) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 80)
  }

  const handleJumpToField = (fieldKey: string) => {
    if (fieldKey === 'daycare_training' || fieldKey === 'daycare_activities' || fieldKey === 'grooming_parts') {
      scrollToSection(recordMainSectionRef)
      return
    }
    if (fieldKey === 'photos') {
      scrollToSection(photosSectionRef)
      return
    }
    if (fieldKey === 'condition') {
      setCollapsed((s) => ({ ...s, condition: false }))
      scrollToSection(conditionSectionRef)
    }
    if (fieldKey === 'health_check') {
      setCollapsed((s) => ({ ...s, health: false }))
      scrollToSection(healthSectionRef)
    }
    if (fieldKey === 'hotel_stay') {
      scrollToSection(hotelStaySectionRef)
      return
    }
    if (fieldKey === 'hotel_care_logs') {
      setCollapsed((s) => ({ ...s, careLogs: false }))
      scrollToSection(hotelCareSectionRef)
      return
    }
    if (fieldKey === 'internal_notes') {
      scrollToSection(internalMemoSectionRef)
      return
    }
    if (fieldKey === 'report_text') {
      scrollToSection(reportSectionRef)
    }
  }

  const handleGenerateReport = async () => {
    await handleAISuggestionAction('report-draft', undefined, {
      regenerate: true,
      tone: selectedReportTone,
    })
  }

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
                      <img src={dog.photo_url} alt={dog.name} className="size-10 rounded-full object-cover" />
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

          {aiSettings.aiAssistantEnabled ? (
            <div className="mx-4 mt-4 rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-foreground">AIで報告文を作成</p>
                  <p className="text-xs text-muted-foreground mt-1">上の入力内容をもとに生成します</p>
                </div>
                {missingInputCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (firstMissingField) handleJumpToField(firstMissingField)
                    }}
                    className="shrink-0 rounded-full bg-chart-4/10 px-2.5 py-1 text-[11px] font-bold text-chart-4 hover:bg-chart-4/20 active:scale-95 transition-all"
                  >
                    未入力 {missingInputCount}項目
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
                >
                  <Icon icon="solar:magic-stick-3-bold" width="14" height="14" />
                  作成する
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReportTone('formal')
                    setReportTone('formal')
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold active:scale-[0.98] transition-all ${
                    selectedReportTone === 'formal'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  丁寧
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReportTone('casual')
                    setReportTone('casual')
                  }}
                  className={`rounded-lg border px-3 py-2 text-xs font-bold active:scale-[0.98] transition-all ${
                    selectedReportTone === 'casual'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  カジュアル
                </button>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                文体を選んでから「作成する」を押すと生成します。
              </p>

              {reportSuggestion?.preview && !reportSuggestion.dismissed && !reportSuggestion.applied && (
                <div className="mt-3 rounded-xl border border-border bg-background p-3">
                  <p className="text-xs font-bold text-muted-foreground mb-2">生成プレビュー</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{reportSuggestion.preview}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleAISuggestionAction('report-draft', reportSuggestion.preview)}
                      className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-primary/90 active:scale-[0.98] transition-all"
                    >
                      この内容を反映
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAISuggestionDismiss('report-draft')}
                      className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted active:scale-[0.98] transition-all"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mx-4 mt-4 rounded-2xl border border-border bg-white p-4 text-xs text-muted-foreground">
              AIアシスタントはオフです。ヘッダー右上の設定から有効化できます。
            </div>
          )}

          <div ref={reportSectionRef}>
            <RequiredSection title="飼い主への報告文" completed={!!notes.report_text?.trim()}>
              <textarea
                value={notes.report_text || ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, report_text: e.target.value }))}
                placeholder="今日の様子を飼い主さんにお伝えする文章を入力してください"
                className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-border resize-y focus:outline-none focus:ring-2 focus:ring-orange-200"
                style={{ minHeight: 120 }}
              />
            </RequiredSection>
          </div>

          <div ref={internalMemoSectionRef} className="mx-4 mt-4 rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon icon="solar:lock-keyhole-bold" width="16" height="16" className="text-muted-foreground" />
              <h3 className="text-sm font-bold text-foreground">内部メモ（飼い主に非公開）</h3>
            </div>
            <textarea
              value={notes.internal_notes || ''}
              onChange={(e) => setNotes((prev) => ({ ...prev, internal_notes: e.target.value }))}
              placeholder="スタッフ間の申し送りなど"
              className="w-full px-3 py-2 bg-white rounded-xl text-sm border border-border resize-none focus:outline-none focus:ring-2 focus:ring-border"
              style={{ minHeight: 88 }}
            />
          </div>

          {/* Fixed footer with save/share buttons */}
          <div className="fixed bottom-[72px] inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-border px-4 py-3 safe-area-pb shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
            <div className="flex gap-3 max-w-lg mx-auto">
              <button
                onClick={() => handleSave(false)}
                disabled={saving}
                className={`flex-1 ${BTN_SECONDARY}`}
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleShare}
                disabled={saving}
                className={`flex-1 ${BTN_PRIMARY}`}
                style={{
                  background: `linear-gradient(135deg, ${getBusinessTypeColors(recordType).primary} 0%, ${getBusinessTypeColors(recordType).primary}DD 100%)`,
                  boxShadow: `0 2px 8px ${getBusinessTypeColors(recordType).primary}40`,
                }}
              >
                保存して送信
              </button>
            </div>
          </div>
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
