import { useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { getBusinessTypeColors, getBusinessTypeLabel, getRecordLabel } from '../utils/businessTypeColors'
import { useAuthStore } from '../store/authStore'
import type {
  RecordType,
  RecordFormData,
  DaycareData,
  GroomingData,
  HotelData,
  PhotosData,
  NotesData,
  ConditionData,
  HealthCheckData,
} from '../types/record'
import type { AISuggestionData, AISuggestionType } from '../types/ai'
import { normalizePhotosData } from '../utils/recordPhotos'
import { validateRecord } from '../utils/recordValidation'
import RecordHeader from './records/components/RecordHeader'
import PetInfoCard from './records/components/PetInfoCard'
import RequiredSection from './records/components/RequiredSection'
import OptionalSection from './records/components/OptionalSection'
import DaycareForm from './records/components/DaycareForm'
import GroomingForm from './records/components/GroomingForm'
import HotelForm from './records/components/HotelForm'
import PhotosForm from './records/components/PhotosForm'
import NotesForm from './records/components/NotesForm'
import ConditionForm from './records/components/ConditionForm'
import HealthCheckForm from './records/components/HealthCheckForm'
import AISettingsScreen from './records/components/AISettingsScreen'

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

  // Form data
  const [daycareData, setDaycareData] = useState<DaycareData>({ activities: [] })
  const [groomingData, setGroomingData] = useState<GroomingData>({ selectedParts: [], partNotes: {} })
  const [hotelData, setHotelData] = useState<HotelData>({ check_in: '', check_out_scheduled: '', nights: 1 })
  const [photos, setPhotos] = useState<PhotosData>({ regular: [], concerns: [] })
  const [notes, setNotes] = useState<NotesData>({ internal_notes: null, report_text: null })
  const [condition, setCondition] = useState<ConditionData | null>(null)
  const [healthCheck, setHealthCheck] = useState<HealthCheckData | null>(null)

  // UI state
  const [saving, setSaving] = useState(false)
  const [copyLoading, setCopyLoading] = useState(false)
  const [collapsed, setCollapsed] = useState({ condition: true, health: true })
  const [showAISettings, setShowAISettings] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Record<AISuggestionType, AISuggestionData | null>>({
    'photo-concern': null,
    'health-history': null,
    'report-draft': null,
  })

  // Fetch dogs list
  const { data: dogs = [] } = useSWR<Dog[]>('/dogs?limit=200', fetcher)
  const selectedDog = dogs.find((d) => d.id === selectedDogId)

  interface StoreSettings {
    ai_assistant_enabled?: boolean
    ai_store_data_contribution?: boolean
    ai_service_improvement?: boolean
  }

  const { data: storeSettings, mutate: mutateStoreSettings } = useSWR<StoreSettings>('/store-settings', fetcher, { revalidateOnFocus: false })

  const aiSettings = useMemo(() => ({
    aiAssistantEnabled: storeSettings?.ai_assistant_enabled ?? true,
    storeDataContribution: storeSettings?.ai_store_data_contribution ?? true,
    serviceImprovement: storeSettings?.ai_service_improvement ?? false,
  }), [storeSettings?.ai_assistant_enabled, storeSettings?.ai_service_improvement, storeSettings?.ai_store_data_contribution])

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

  useEffect(() => {
    if (!aiSettings.aiAssistantEnabled) {
      setAiSuggestions({ 'photo-concern': null, 'health-history': null, 'report-draft': null })
    }
  }, [aiSettings.aiAssistantEnabled])

  useEffect(() => {
    if (!aiSettings.aiAssistantEnabled) return
    if (notes.report_text && notes.report_text.trim().length > 0) {
      if (aiSuggestions['report-draft']) {
        setAiSuggestions((prev) => ({ ...prev, 'report-draft': null }))
      }
      return
    }
    if (aiSuggestions['report-draft']?.dismissed) return
    setAiSuggestions((prev) => ({
      ...prev,
      'report-draft': {
        type: 'report-draft',
        message: '入力内容から報告文を作成しました',
        actionLabel: '下書きを使用',
        variant: 'default',
        preview: 'AIで報告文を生成できます',
      },
    }))
  }, [aiSettings.aiAssistantEnabled, notes.report_text])

  const handleSave = async (shareAfter = false) => {
    if (!selectedDogId) {
      showToast('ワンちゃんを選択してください', 'error')
      return
    }

    const validation = validateRecord({
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
      const formData: RecordFormData = {
        dog_id: selectedDogId,
        reservation_id: reservationId ? parseInt(reservationId) : null,
        record_type: recordType,
        record_date: new Date().toISOString().split('T')[0],
        daycare_data: recordType === 'daycare' ? daycareData : undefined,
        grooming_data: recordType === 'grooming' ? groomingData : undefined,
        hotel_data: recordType === 'hotel' ? hotelData : undefined,
        photos: normalizePhotosData(photos),
        notes,
        condition,
        health_check: healthCheck,
        status: shareAfter ? 'shared' : 'saved',
      }

      const res = await recordsApi.create(formData)
      const recordId = res.data.id

      if (shareAfter) {
        await recordsApi.share(recordId)
        showToast(`${recordLabel}を共有しました`, 'success')
      } else {
        showToast(`${recordLabel}を保存しました`, 'success')
      }

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

  const handleAISuggestionAction = async (type: AISuggestionType) => {
    if (type === 'photo-concern') {
      const suggestion = aiSuggestions['photo-concern']
      const payload = suggestion?.payload as { photoUrl?: string; label?: string; annotation?: { x: number; y: number } } | undefined
      if (payload?.photoUrl) {
        setPhotos((prev) => ({
          ...prev,
          concerns: [
            ...(prev.concerns || []),
            {
              id: `ai-${Date.now()}`,
              url: payload.photoUrl,
              uploadedAt: new Date().toISOString(),
              label: payload.label || '気になる箇所',
              annotation: payload.annotation,
            },
          ],
        }))
      }
    }

    if (type === 'health-history') {
      setNotes((prev) => ({
        ...prev,
        report_text: `${prev.report_text || ''}\n\n耳の汚れが2回連続しています。継続的なケアをおすすめします。`.trim(),
      }))
    }

    if (type === 'report-draft') {
      if (!selectedDog) return
      try {
        const response = await api.post('/ai/generate-report', {
          record_type: recordType,
          dog_name: selectedDog.name,
          grooming_data: recordType === 'grooming' ? groomingData : undefined,
          daycare_data: recordType === 'daycare' ? daycareData : undefined,
          hotel_data: recordType === 'hotel' ? hotelData : undefined,
          condition,
          health_check: healthCheck,
          photos,
          notes,
        })
        const report = response.data?.report
        if (report) {
          setNotes((prev) => ({ ...prev, report_text: report }))
        }
      } catch {
        showToast('報告文の生成に失敗しました', 'error')
        return
      }
    }

    setAiSuggestions((prev) => ({
      ...prev,
      [type]: prev[type] ? { ...prev[type]!, applied: true } : prev[type],
    }))

    setTimeout(() => {
      setAiSuggestions((prev) => ({
        ...prev,
        [type]: prev[type] ? { ...prev[type]!, dismissed: true } : prev[type],
      }))
    }, 2000)
  }

  const handleAISuggestionDismiss = (type: AISuggestionType) => {
    setAiSuggestions((prev) => ({
      ...prev,
      [type]: prev[type] ? { ...prev[type]!, dismissed: true } : prev[type],
    }))
  }

  const handlePhotoAdded = async (photoUrl: string, type: 'regular' | 'concern') => {
    if (!aiSettings.aiAssistantEnabled || recordType !== 'grooming' || type !== 'regular') return
    try {
      const response = await api.post('/ai/analyze-photo', {
        mode: 'record',
        record_type: recordType,
        photo: photoUrl,
      })
      const suggestion = response.data?.suggestion as AISuggestionData | undefined
      if (suggestion) {
        setAiSuggestions((prev) => ({ ...prev, 'photo-concern': suggestion }))
      }
    } catch {
      // ignore AI errors
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
        onSettings={() => setShowAISettings(true)}
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
          <RequiredSection title={recordType === 'daycare' ? '今日の活動' : recordType === 'grooming' ? 'カット内容' : '宿泊情報'}>
            {recordType === 'daycare' && (
              <DaycareForm data={daycareData} onChange={setDaycareData} />
            )}
            {recordType === 'grooming' && (
              <GroomingForm data={groomingData} onChange={setGroomingData} />
            )}
            {recordType === 'hotel' && (
              <HotelForm data={hotelData} onChange={setHotelData} />
            )}
          </RequiredSection>

          <RequiredSection title="写真">
            <PhotosForm
              data={photos}
              onChange={setPhotos}
              showConcerns={recordType === 'grooming'}
              aiSuggestion={aiSuggestions['photo-concern']}
              onAISuggestionAction={() => handleAISuggestionAction('photo-concern')}
              onAISuggestionDismiss={() => handleAISuggestionDismiss('photo-concern')}
              onPhotoAdded={handlePhotoAdded}
            />
          </RequiredSection>

          <RequiredSection title="報告文">
            <NotesForm
              data={notes}
              onChange={setNotes}
              aiSuggestion={aiSuggestions['report-draft']}
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
              aiSuggestion={aiSuggestions['health-history']}
              onAISuggestionAction={() => handleAISuggestionAction('health-history')}
              onAISuggestionDismiss={() => handleAISuggestionDismiss('health-history')}
            />
          </OptionalSection>
        </>
      )}

      <AISettingsScreen
        open={showAISettings}
        onClose={() => setShowAISettings(false)}
        initialSettings={aiSettings}
        onSave={async (settings) => {
          try {
            await api.put('/store-settings', {
              ai_assistant_enabled: settings.aiAssistantEnabled,
              ai_store_data_contribution: settings.storeDataContribution,
              ai_service_improvement: settings.serviceImprovement,
            })
            mutateStoreSettings()
            showToast('AI設定を保存しました', 'success')
          } catch {
            showToast('AI設定の保存に失敗しました', 'error')
          }
        }}
      />
    </div>
  )
}

export default RecordCreate
