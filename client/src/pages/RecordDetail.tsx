import { useState, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { recordsApi } from '../api/records'
import { useToast } from '../components/Toast'
import { useConfirmDialog } from '../hooks/useConfirmDialog'
import ConfirmDialog from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'
import { useAutoSave } from '../hooks/useAutoSave'
import RecordHeader from './records/components/RecordHeader'
import PetInfoCard from './records/components/PetInfoCard'
import RequiredSection from './records/components/RequiredSection'
import OptionalSection from './records/components/OptionalSection'
import PhotosForm from './records/components/PhotosForm'
import ConditionForm from './records/components/ConditionForm'
import HealthCheckForm from './records/components/HealthCheckForm'
import AISettingsScreen from './records/components/AISettingsScreen'
import RecordTypeSection from './records/components/RecordTypeSection'
import RecordReportComposer from './records/components/RecordReportComposer'
import RecordSaveFooter from './records/components/RecordSaveFooter'
import { useRecordFormState } from './records/hooks/useRecordFormState'
import { useRecordEditorCore } from './records/hooks/useRecordEditorCore'
import { buildUpdateRecordPayload, validateRecordForm } from './records/utils/recordForm'
import { useAISettings } from './records/hooks/useAISettings'
import { useRecordAISuggestions } from './records/hooks/useRecordAISuggestions'
import { useRecordDetail } from './records/hooks/useRecordDetail'
import { getRecordLabel } from '../domain/businessTypeConfig'
import { useAuthStore } from '../store/authStore'
import { calculateAge } from '../utils/dog'
import { normalizePhotosData } from '../utils/recordPhotos'

const RecordDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()
  const primaryBusinessType = useAuthStore((s) => s.user?.primaryBusinessType)
  const storeId = useAuthStore((s) => s.user?.storeId ?? 0)
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
  const [collapsed, setCollapsed] = useState({ condition: true, health: true })
  const [activeTab, setActiveTab] = useState<'record' | 'report'>('record')

  const {
    aiSettings,
    showAISettings,
    openAISettings,
    closeAISettings,
    saveAISettings,
  } = useAISettings()

  const { record, isLoading, mutate, weightHistory } = useRecordDetail({
    recordId: id,
    setDaycareData,
    setGroomingData,
    setHotelData,
    setPhotos,
    setNotes,
    setCondition,
    setHealthCheck,
    setCollapsed,
  })

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
    recordId: record?.id,
    onReportDraftError: () => showToast('報告文の生成に失敗しました', 'error'),
  })

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

  const validateEditor = useCallback((mode: 'save' | 'share') =>
    validateRecordForm({
      recordType: record?.record_type || 'daycare',
      groomingData,
      daycareData,
      hotelData,
      photos,
      notes,
      condition,
      healthCheck,
    }, mode), [record?.record_type, groomingData, daycareData, hotelData, photos, notes, condition, healthCheck])

  const saveRecord = useCallback(async () => {
    if (!id || !record) return

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
  }, [condition, daycareData, groomingData, healthCheck, hotelData, id, mutate, notes, photos, record, sendAIFeedback, showToast])

  const shareRecord = useCallback(async () => {
    if (!id) return

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
  }, [condition, daycareData, groomingData, healthCheck, hotelData, id, mutate, notes, photos, record?.record_type, sendAIFeedback, showToast])

  const {
    saving,
    handleSave,
    handleShare,
    handleGenerateReport,
    handleToneChangeAndGenerate,
  } = useRecordEditorCore({
    validate: validateEditor,
    onValidationError: (message) => showToast(message, 'error'),
    onSave: saveRecord,
    onShare: shareRecord,
    onSaveError: () => showToast('保存に失敗しました', 'error'),
    onShareError: () => showToast('送信に失敗しました', 'error'),
    confirmShare: () => confirm({
      title: '送信確認',
      message: '飼い主に送信しますか？',
      confirmLabel: '送信',
      cancelLabel: 'キャンセル',
      variant: 'default',
    }),
    onToneChange: setReportTone,
    onGenerateReport: (tone) => handleAISuggestionAction('report-draft', undefined, {
      regenerate: true,
      tone,
    }),
  })

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
    const ok = await confirm({
      title: '削除確認',
      message: `この${recordLabel}を削除しますか？`,
      confirmLabel: '削除',
      cancelLabel: 'キャンセル',
      variant: 'destructive',
    })
    if (!ok) return
    try {
      await recordsApi.delete(id)
      showToast(`${recordLabel}を削除しました`, 'success')
      navigate('/records', { replace: true })
    } catch {
      showToast('削除に失敗しました', 'error')
    }
  }, [id, navigate, showToast, confirm, recordLabel])

  const handleJumpToField = (fieldKey: string) => {
    setActiveTab('record')
    if (fieldKey === 'condition') {
      setCollapsed((s) => ({ ...s, condition: false }))
    }
    if (fieldKey === 'health_check') {
      setCollapsed((s) => ({ ...s, health: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
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
    <div className="min-h-screen bg-background pb-32">
      <RecordHeader
        petName={record.dog_name}
        recordType={record.record_type}
        autoSaveStatus={autoSaveStatus}
        onSettings={openAISettings}
      />

      <PetInfoCard
        petName={record.dog_name || ''}
        breed={record.dog_breed}
        age={record.dog_birth_date ? calculateAge(record.dog_birth_date) : undefined}
        photoUrl={record.dog_photo}
        recordType={record.record_type}
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

      {activeTab === 'record' && (
        <>
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

          {/* Business-type specific form */}
          <RecordTypeSection
            recordType={record.record_type}
            daycareData={daycareData}
            groomingData={groomingData}
            hotelData={hotelData}
            onDaycareChange={setDaycareData}
            onGroomingChange={setGroomingData}
            onHotelChange={setHotelData}
            storeId={storeId}
          />

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
        </>
      )}

      {activeTab === 'report' && (
        <RequiredSection title="報告文">
          <RecordReportComposer
            mode="detail"
            notes={notes}
            onNotesChange={setNotes}
            aiSuggestion={recordAISuggestions['report-draft']}
            inputTrace={aiSettings.aiAssistantEnabled ? reportInputTrace : []}
            generatedFrom={aiSettings.aiAssistantEnabled ? (recordAISuggestions['report-draft']?.generated_from || []) : []}
            onRegenerate={handleGenerateReport}
            onToneChange={handleToneChangeAndGenerate}
            onJumpToField={handleJumpToField}
            onAISuggestionAction={(editedText) => handleAISuggestionAction('report-draft', editedText)}
            onAISuggestionDismiss={() => handleAISuggestionDismiss('report-draft')}
          />
        </RequiredSection>
      )}

      {/* Delete button */}
      <div className="mx-4 mt-8 mb-4">
        <button
          onClick={handleDelete}
          className="w-full py-3 text-sm text-destructive font-medium rounded-xl border border-destructive/20 hover:bg-destructive/10 active:scale-[0.98] transition-all"
        >
          {recordLabel}を削除
        </button>
      </div>

      <RecordSaveFooter
        mode="detail"
        recordType={record.record_type}
        saving={saving}
        onSave={handleSave}
        onShare={handleShare}
        shareDisabled={record.status === 'shared'}
        shareLabel={record.status === 'shared' ? '共有済み' : '共有'}
      />

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

      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </div>
  )
}

export default RecordDetail
