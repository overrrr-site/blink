import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import { useToast } from '../components/Toast'
import { getBusinessTypeColors, getBusinessTypeLabel, getRecordLabel } from '../utils/businessTypeColors'
import { useAuthStore } from '../store/authStore'
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

function RecordTypeSelector({ recordType, onSelect, recordLabel }: { recordType: RecordType; onSelect: (t: RecordType) => void; recordLabel: string }) {
  return (
    <div className="mx-4 mt-4">
      <p className="text-sm font-medium text-slate-500 mb-2">{recordLabel}種別</p>
      <div className="flex gap-2">
        {(['daycare', 'grooming', 'hotel'] as const).map((type) => {
          const colors = getBusinessTypeColors(type)
          const label = getBusinessTypeLabel(type)
          const selected = recordType === type
          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]"
              style={{
                background: selected ? colors.pale : '#FFFFFF',
                border: selected ? `1.5px solid ${colors.primary}` : '1px solid #E2E8F0',
                color: selected ? colors.primary : '#94A3B8',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface Dog {
  id: number
  name: string
  breed: string
  birth_date: string
  photo_url: string | null
  owner_name: string
}

const RecordCreate = () => {
  const navigate = useNavigate()
  const { reservationId } = useParams()
  const { showToast } = useToast()
  const primaryBusinessType = useAuthStore((s) => s.user?.primaryBusinessType)
  const recordLabel = getRecordLabel(primaryBusinessType)

  // Dog selection
  const [selectedDogId, setSelectedDogId] = useState<number | null>(null)
  const [recordType, setRecordType] = useState<RecordType>('daycare')

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

  // Fetch dogs list
  const { data: dogs = [] } = useSWR<Dog[]>('/dogs?limit=200', fetcher)
  const selectedDog = dogs.find((d) => d.id === selectedDogId)

  const {
    aiSettings,
    showAISettings,
    openAISettings,
    closeAISettings,
    saveAISettings,
  } = useAISettings()

  // Fetch reservation data if creating from reservation
  useSWR(
    reservationId ? `/reservations/${reservationId}` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data?.dog_id && !selectedDogId) {
          setSelectedDogId(data.dog_id)
        }
      },
    }
  )

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    if (years > 0) return `${years}歳${months >= 0 ? months : 12 + months}ヶ月`
    return `${months >= 0 ? months : 12 + months}ヶ月`
  }

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

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <RecordHeader
        petName={selectedDog?.name}
        recordType={recordType}
        saving={saving}
        onSave={() => handleSave(false)}
        onShare={handleShare}
        onSettings={openAISettings}
      />

      {/* Dog Selection */}
      {!selectedDogId && (
        <div className="mx-4 mt-4">
          <h3 className="text-sm font-bold text-slate-700 mb-2">ワンちゃんを選択</h3>
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

          {/* Record Type Selector (future: show based on store business_types) */}
          <RecordTypeSelector recordType={recordType} onSelect={setRecordType} recordLabel={recordLabel} />

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
              showConcerns={recordType === 'grooming'}
              aiSuggestion={recordAISuggestions['photo-concern']}
              onAISuggestionAction={() => handleAISuggestionAction('photo-concern')}
              onAISuggestionDismiss={() => handleAISuggestionDismiss('photo-concern')}
              onPhotoAdded={handlePhotoAdded}
            />
          </RequiredSection>

          <RequiredSection title="報告文">
            <NotesForm
              data={notes}
              onChange={setNotes}
              aiSuggestion={recordAISuggestions['report-draft']}
              onAISuggestionAction={() => handleAISuggestionAction('report-draft')}
              onAISuggestionDismiss={() => handleAISuggestionDismiss('report-draft')}
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
              onAISuggestionAction={() => handleAISuggestionAction('health-history')}
              onAISuggestionDismiss={() => handleAISuggestionDismiss('health-history')}
            />
          </OptionalSection>
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
