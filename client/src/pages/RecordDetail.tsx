import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../lib/swr'
import { recordsApi } from '../api/records'
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

const RecordDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

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

  // Fetch record
  const { data: record, isLoading, mutate } = useSWR<RecordItem>(
    id ? `/records/${id}` : null,
    fetcher
  )

  // Populate form with record data
  useEffect(() => {
    if (!record) return
    if (record.daycare_data) setDaycareData(record.daycare_data)
    if (record.grooming_data) setGroomingData(record.grooming_data)
    if (record.hotel_data) setHotelData(record.hotel_data)
    if (record.photos) setPhotos(record.photos)
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
    if (!notes.report_text || notes.report_text.trim().length < 10) {
      showToast('報告文を10文字以上入力してください', 'error')
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

  const handleDelete = useCallback(async () => {
    if (!id) return
    if (!confirm('このカルテを削除しますか？')) return
    try {
      await recordsApi.delete(id)
      showToast('カルテを削除しました', 'success')
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
        <p className="text-lg font-medium text-foreground mb-2">カルテが見つかりません</p>
        <button
          onClick={() => navigate('/records')}
          className="text-primary text-sm font-medium"
        >
          カルテ一覧に戻る
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
        />
      </RequiredSection>

      <RequiredSection title="報告文">
        <NotesForm data={notes} onChange={setNotes} />
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
        <HealthCheckForm data={healthCheck} onChange={setHealthCheck} />
      </OptionalSection>

      {/* Delete button */}
      <div className="mx-4 mt-8 mb-4">
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-red-500 font-medium rounded-xl border border-red-200 hover:bg-red-50 transition-colors"
        >
          カルテを削除
        </button>
      </div>

      {/* AI Settings Drawer */}
      <AISettingsScreen
        open={showAISettings}
        onClose={() => setShowAISettings(false)}
      />
    </div>
  )
}

export default RecordDetail
