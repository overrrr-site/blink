import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icon'
import { useAutoSave } from '../hooks/useAutoSave'
import type { RecordItem } from '../types/record'
import type { PaginatedResponse } from '../types/api'
import { normalizePhotosData } from '../utils/recordPhotos'
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
import { buildUpdateRecordPayload, validateRecordForm } from './records/utils/recordForm'
import { useAISettings } from './records/hooks/useAISettings'
import { useRecordAISuggestions } from './records/hooks/useRecordAISuggestions'
import { getRecordLabel } from '../domain/businessTypeConfig'
import { useAuthStore } from '../store/authStore'

const RecordDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const primaryBusinessType = useAuthStore((s) => s.user?.primaryBusinessType)
  const recordLabel = getRecordLabel(primaryBusinessType)

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
  const [collapsed, setCollapsed] = useState({ condition: true, health: true })

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

  const {
    aiSettings,
    showAISettings,
    openAISettings,
    closeAISettings,
    saveAISettings,
  } = useAISettings()

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

  const aiContext = useMemo(() => ({
    recordType: record?.record_type ?? 'daycare',
    dogName: record?.dog_name || 'ワンちゃん',
    daycareData,
    groomingData,
    hotelData,
    photos,
    notes,
    condition,
    healthCheck,
  }), [record?.record_type, record?.dog_name, daycareData, groomingData, hotelData, photos, notes, condition, healthCheck])

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
    recordId: record?.id,
    onReportDraftError: () => showToast('報告文の生成に失敗しました', 'error'),
  })

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
    const updates = buildUpdateRecordPayload({
      recordType: record.record_type,
      daycareData: data.daycareData,
      groomingData: data.groomingData,
      hotelData: data.hotelData,
      photos: data.photos,
      notes: data.notes,
      condition: data.condition,
      healthCheck: data.healthCheck,
    })
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

    const validation = validateRecordForm({
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
      const updates = buildUpdateRecordPayload({
        recordType: record.record_type,
        daycareData,
        groomingData,
        hotelData,
        photos,
        notes,
        condition,
        healthCheck,
        status: 'saved',
      })
      await recordsApi.update(id, updates)
      await mutate()
      await sendAIFeedback(notes.report_text)
      showToast('保存しました', 'success')
    } catch {
      showToast('保存に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }, [id, record, daycareData, groomingData, hotelData, photos, notes, condition, healthCheck, mutate, showToast])

  const handleShare = useCallback(async () => {
    if (!id) return

    const validation = validateRecordForm({
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
      const updates = buildUpdateRecordPayload({
        recordType: record?.record_type || 'daycare',
        daycareData,
        groomingData,
        hotelData,
        photos,
        notes,
        condition,
        healthCheck,
      })
      await recordsApi.update(id, updates)
      await recordsApi.share(id)
      await mutate()
      await sendAIFeedback(notes.report_text)
      showToast('飼い主に送信しました', 'success')
    } catch {
      showToast('送信に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }, [id, record, daycareData, groomingData, hotelData, photos, notes, condition, healthCheck, mutate, showToast])

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
    await analyzePhotoConcern(photoUrl)
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
        onSettings={openAISettings}
      />

      <PetInfoCard
        petName={record.dog_name || ''}
        breed={record.dog_breed}
        age={record.dog_birth_date ? calculateAge(record.dog_birth_date) : undefined}
        photoUrl={record.dog_photo}
        recordType={record.record_type}
      />

      {/* Business-type specific form */}
      <RecordTypeSection
        recordType={record.record_type}
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
          recordType={record.record_type}
          showConcerns={record.record_type === 'grooming'}
          aiSuggestion={recordAISuggestions['photo-concern']}
          onAISuggestionAction={(editedText) => handleAISuggestionAction('photo-concern', editedText)}
          onAISuggestionDismiss={() => handleAISuggestionDismiss('photo-concern')}
          onPhotoAdded={handlePhotoAdded}
        />
      </RequiredSection>

      <RequiredSection title="報告文">
        <NotesForm
          data={notes}
          onChange={setNotes}
          aiSuggestion={recordAISuggestions['report-draft']}
          onAISuggestionAction={(editedText) => handleAISuggestionAction('report-draft', editedText)}
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
          aiSuggestion={recordAISuggestions['health-history']}
          onAISuggestionAction={(editedText) => handleAISuggestionAction('health-history', editedText)}
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

export default RecordDetail
