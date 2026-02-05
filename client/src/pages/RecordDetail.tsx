import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import api from '../api/client'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icon'
import { useAutoSave } from '../hooks/useAutoSave'
import type {
  RecordItem,
  RecordFormData,
  DaycareData,
  GroomingData,
  HotelData,
  PhotosData,
  NotesData,
  ConditionData,
  HealthCheckData,
} from '../types/record'
import type { PaginatedResponse } from '../types/api'
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
import { getRecordLabel } from '../utils/businessTypeColors'
import { useAuthStore } from '../store/authStore'

const RecordDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const primaryBusinessType = useAuthStore((s) => s.user?.primaryBusinessType)
  const recordLabel = getRecordLabel(primaryBusinessType)

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
  const [collapsed, setCollapsed] = useState({ condition: true, health: true })
  const [showAISettings, setShowAISettings] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Record<AISuggestionType, AISuggestionData | null>>({
    'photo-concern': null,
    'health-history': null,
    'report-draft': null,
    'weight-change': null,
    'long-absence': null,
    'birthday': null,
    'follow-up': null,
    'training-progress': null,
    'long-stay': null,
  })

  // Fetch record
  const { data: record, isLoading, mutate } = useSWR<RecordItem>(
    id ? `/records/${id}` : null,
    fetcher
  )

  const { data: weightRecords } = useSWR<PaginatedResponse<RecordItem>>(
    record?.dog_id && record.record_type === 'grooming'
      ? `/records?dog_id=${record.dog_id}&record_type=grooming&limit=6`
      : null,
    fetcher,
  )

  const weightHistory = useMemo(() => {
    if (!weightRecords?.data) return []
    return weightRecords.data
      .filter((item) => item.health_check?.weight !== undefined && item.health_check?.weight !== null)
      .map((item) => {
        const d = new Date(item.record_date)
        return {
          date: `${d.getMonth() + 1}/${d.getDate()}`,
          weight: Number(item.health_check?.weight),
        }
      })
      .reverse()
  }, [weightRecords?.data])

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

  // Populate form with record data
  useEffect(() => {
    if (!record) return
    if (record.daycare_data) setDaycareData(record.daycare_data)
    if (record.grooming_data) setGroomingData(record.grooming_data)
    if (record.hotel_data) setHotelData(record.hotel_data)
    setPhotos(normalizePhotosData(record.photos || { regular: [], concerns: [] }))
    if (record.notes) setNotes(record.notes)
    if (record.condition) {
      setCondition(record.condition)
      setCollapsed((s) => ({ ...s, condition: false }))
    }
    if (record.health_check) {
      setHealthCheck(record.health_check)
      setCollapsed((s) => ({ ...s, health: false }))
    }
  }, [record])

  useEffect(() => {
    if (!aiSettings.aiAssistantEnabled) {
      setAiSuggestions({
        'photo-concern': null,
        'health-history': null,
        'report-draft': null,
        'weight-change': null,
        'long-absence': null,
        'birthday': null,
        'follow-up': null,
        'training-progress': null,
        'long-stay': null,
      })
    }
  }, [aiSettings.aiAssistantEnabled])

  useEffect(() => {
    if (!record || !aiSettings.aiAssistantEnabled) return
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
  }, [aiSettings.aiAssistantEnabled, notes.report_text, record])

  useEffect(() => {
    if (!record || !aiSettings.aiAssistantEnabled) return
    const fetchSuggestions = async () => {
      try {
        const response = await api.get(`/ai/suggestions/${record.id}`)
        const suggestions = response.data?.suggestions as AISuggestionData[] | undefined
        if (!suggestions || suggestions.length === 0) return
        setAiSuggestions((prev) => {
          const next = { ...prev }
          suggestions.forEach((suggestion) => {
            next[suggestion.type] = suggestion
          })
          return next
        })
      } catch {
        // ignore AI errors
      }
    }
    fetchSuggestions()
  }, [aiSettings.aiAssistantEnabled, record?.id, record?.record_type, healthCheck])

  const calculateAge = (birthDate: string): string => {
    const birth = new Date(birthDate)
    const now = new Date()
    const years = now.getFullYear() - birth.getFullYear()
    const months = now.getMonth() - birth.getMonth()
    if (years > 0) return `${years}歳${months >= 0 ? months : 12 + months}ヶ月`
    return `${months >= 0 ? months : 12 + months}ヶ月`
  }

  // Auto-save data aggregate
  const autoSaveData = useMemo(() => ({
    daycareData,
    groomingData,
    hotelData,
    photos,
    notes,
    condition,
    healthCheck,
  }), [daycareData, groomingData, hotelData, photos, notes, condition, healthCheck])

  const handleAutoSave = useCallback(async (data: typeof autoSaveData) => {
    if (!id || !record) return
    const updates: Partial<RecordFormData> = {
      daycare_data: record.record_type === 'daycare' ? data.daycareData : undefined,
      grooming_data: record.record_type === 'grooming' ? data.groomingData : undefined,
      hotel_data: record.record_type === 'hotel' ? data.hotelData : undefined,
      photos: data.photos,
      notes: data.notes,
      condition: data.condition,
      health_check: data.healthCheck,
    }
    await recordsApi.update(id, updates)
  }, [id, record])

  const { status: autoSaveStatus } = useAutoSave({
    data: autoSaveData,
    onSave: handleAutoSave,
    disabled: !record || record.status === 'shared',
    recordId: id,
  })

  const handleSave = useCallback(async () => {
    if (!id || !record) return

    const validation = validateRecord({
      recordType: record.record_type,
      groomingData,
      daycareData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    }, 'save')

    if (!validation.ok) {
      showToast(validation.errors[0], 'error')
      return
    }

    setSaving(true)
    try {
      const updates: Partial<RecordFormData> = {
        daycare_data: record.record_type === 'daycare' ? daycareData : undefined,
        grooming_data: record.record_type === 'grooming' ? groomingData : undefined,
        hotel_data: record.record_type === 'hotel' ? hotelData : undefined,
        photos,
        notes,
        condition,
        health_check: healthCheck,
        status: 'saved',
      }
      await recordsApi.update(id, updates)
      await mutate()
      showToast('保存しました', 'success')
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }, [id, record, daycareData, groomingData, hotelData, photos, notes, condition, healthCheck, mutate, showToast])

  const handleShare = useCallback(async () => {
    if (!id) return

    const validation = validateRecord({
      recordType: record?.record_type || 'daycare',
      groomingData,
      daycareData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    }, 'share')

    if (!validation.ok) {
      showToast(validation.errors[0], 'error')
      return
    }
    if (!confirm('飼い主に送信しますか？')) return

    setSaving(true)
    try {
      // Save first, then share
      const updates: Partial<RecordFormData> = {
        daycare_data: record?.record_type === 'daycare' ? daycareData : undefined,
        grooming_data: record?.record_type === 'grooming' ? groomingData : undefined,
        hotel_data: record?.record_type === 'hotel' ? hotelData : undefined,
        photos,
        notes,
        condition,
        health_check: healthCheck,
      }
      await recordsApi.update(id, updates)
      await recordsApi.share(id)
      await mutate()
      showToast('飼い主に送信しました', 'success')
    } catch {
      showToast('送信に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }, [id, record, daycareData, groomingData, hotelData, photos, notes, condition, healthCheck, mutate, showToast])

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
      if (!record) return
      try {
        const response = await api.post('/ai/generate-report', {
          record_type: record.record_type,
          dog_name: record.dog_name || 'ワンちゃん',
          grooming_data: record.record_type === 'grooming' ? groomingData : undefined,
          daycare_data: record.record_type === 'daycare' ? daycareData : undefined,
          hotel_data: record.record_type === 'hotel' ? hotelData : undefined,
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
    if (!record) return
    try {
      const response = await recordsApi.uploadPhoto(record.id, {
        photo: photoUrl,
        type,
      })
      if (response.data?.photos) {
        setPhotos(normalizePhotosData(response.data.photos))
      }
    } catch {
      // ignore upload errors
    }

    if (!aiSettings.aiAssistantEnabled || record.record_type !== 'grooming' || type !== 'regular') return
    try {
      const response = await api.post('/ai/analyze-photo', {
        mode: 'record',
        record_type: record.record_type,
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

  const handleDelete = useCallback(async () => {
    if (!id) return
    if (!confirm(`この${recordLabel}を削除しますか？`)) return
    try {
      await recordsApi.delete(id)
      showToast(`${recordLabel}を削除しました`, 'success')
      navigate('/records', { replace: true })
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }, [id, navigate, showToast])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Icon icon="solar:clipboard-remove-bold" width="48" height="48" className="text-muted-foreground mb-4" />
        <p className="text-lg font-medium text-foreground mb-2">{recordLabel}が見つかりません</p>
        <button
          onClick={() => navigate('/records')}
          className="text-primary text-sm font-medium"
        >
          {recordLabel}一覧に戻る
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <RecordHeader
        petName={record.dog_name}
        recordType={record.record_type}
        status={record.status}
        saving={saving}
        autoSaveStatus={autoSaveStatus}
        onSave={handleSave}
        onShare={handleShare}
        onSettings={() => setShowAISettings(true)}
      />

      <PetInfoCard
        petName={record.dog_name || ''}
        breed={record.dog_breed}
        age={record.dog_birth_date ? calculateAge(record.dog_birth_date) : undefined}
        photoUrl={record.dog_photo}
        recordType={record.record_type}
      />

      {/* Business-type specific form */}
      <RequiredSection title={record.record_type === 'daycare' ? '今日の活動' : record.record_type === 'grooming' ? 'カット内容' : '宿泊情報'}>
        {record.record_type === 'daycare' && (
          <DaycareForm data={daycareData} onChange={setDaycareData} />
        )}
        {record.record_type === 'grooming' && (
          <GroomingForm data={groomingData} onChange={setGroomingData} />
        )}
        {record.record_type === 'hotel' && (
          <HotelForm data={hotelData} onChange={setHotelData} />
        )}
      </RequiredSection>

      <RequiredSection title="写真">
        <PhotosForm
          data={photos}
          onChange={setPhotos}
          showConcerns={record.record_type === 'grooming'}
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
          showWeightGraph={record.record_type === 'grooming'}
          weightHistory={weightHistory}
          aiSuggestion={aiSuggestions['health-history']}
          onAISuggestionAction={() => handleAISuggestionAction('health-history')}
          onAISuggestionDismiss={() => handleAISuggestionDismiss('health-history')}
        />
      </OptionalSection>

      {/* Delete button */}
      <div className="mx-4 mt-8 mb-4">
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-red-500 font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
        >
          {recordLabel}を削除
        </button>
      </div>

      {/* AI Settings Drawer */}
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

export default RecordDetail
