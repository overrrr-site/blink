import { useState, useEffect, useRef } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../api/client'
import { useToast } from '../../components/Toast'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import ConfirmDialog from '../../components/ConfirmDialog'
import DogEditBasicInfo from '../../components/dogs/DogEditBasicInfo'
import DogEditHealth from '../../components/dogs/DogEditHealth'
import DogEditPersonality from '../../components/dogs/DogEditPersonality'
import DogEditLifestyle from '../../components/dogs/DogEditLifestyle'
import type { DogFormData, DogHealthData, DogPersonalityData, DogLifestyleData } from '../../types/dog'
import { DEFAULT_DOG_LIFESTYLE } from '../../types/dog'
import SwipeDownHeader from '../../components/SwipeDownHeader'

interface RecordPhoto {
  url: string
  date: string
}

const DogEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [recordPhotos, setRecordPhotos] = useState<RecordPhoto[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const mixedVaccineInputRef = useRef<HTMLInputElement>(null)
  const rabiesVaccineInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<DogFormData>({
    name: '',
    name_kana: '',
    breed: '',
    birth_date: '',
    gender: 'オス',
    weight: '',
    color: '',
    neutered: '',
    photo_url: '',
    dog_tag_number: '',
    microchip_number: '',
  })
  const [health, setHealth] = useState<DogHealthData>({
    mixed_vaccine_date: '',
    mixed_vaccine_cert_url: '',
    rabies_vaccine_date: '',
    rabies_vaccine_cert_url: '',
    flea_tick_date: '',
    flea_tick_prevention: null,
    heartworm_prevention: null,
    heartworm_prevention_date: '',
    easily_upset_stomach: false,
    easily_hurts_legs: false,
    allergies: '',
    medical_history: '',
  })
  const [personality, setPersonality] = useState<DogPersonalityData>({
    personality_description: '',
    dog_compatibility: '',
    human_reaction: '',
    likes: '',
    dislikes: '',
    toilet_status: '',
    crate_training: '',
  })
  const [lifestyle, setLifestyle] = useState<DogLifestyleData>(DEFAULT_DOG_LIFESTYLE)

  useEffect(() => {
    if (id) {
      fetchDog()
    }
  }, [id])

  const fetchDog = async () => {
    try {
      const response = await api.get(`/dogs/${id}`)
      const dog = response.data
      setForm({
        name: dog.name || '',
        name_kana: dog.name_kana || '',
        breed: dog.breed || '',
        birth_date: dog.birth_date ? dog.birth_date.split('T')[0] : '',
        gender: dog.gender || 'オス',
        weight: dog.weight?.toString() || '',
        color: dog.color || '',
        neutered: dog.neutered || '',
        photo_url: dog.photo_url || '',
        dog_tag_number: dog.dog_tag_number || '',
        microchip_number: dog.microchip_number || '',
      })
      if (dog.health) {
        setHealth({
          mixed_vaccine_date: dog.health.mixed_vaccine_date ? dog.health.mixed_vaccine_date.split('T')[0] : '',
          mixed_vaccine_cert_url: dog.health.mixed_vaccine_cert_url || '',
          mixed_vaccine_cert_access_url: dog.health.mixed_vaccine_cert_access_url || '',
          mixed_vaccine_cert_private: Boolean(dog.health.mixed_vaccine_cert_private),
          rabies_vaccine_date: dog.health.rabies_vaccine_date ? dog.health.rabies_vaccine_date.split('T')[0] : '',
          rabies_vaccine_cert_url: dog.health.rabies_vaccine_cert_url || '',
          rabies_vaccine_cert_access_url: dog.health.rabies_vaccine_cert_access_url || '',
          rabies_vaccine_cert_private: Boolean(dog.health.rabies_vaccine_cert_private),
          flea_tick_date: dog.health.flea_tick_date ? dog.health.flea_tick_date.split('T')[0] : '',
          flea_tick_prevention: typeof dog.health.flea_tick_prevention === 'boolean' ? dog.health.flea_tick_prevention : null,
          heartworm_prevention: typeof dog.health.heartworm_prevention === 'boolean' ? dog.health.heartworm_prevention : null,
          heartworm_prevention_date: dog.health.heartworm_prevention_date ? dog.health.heartworm_prevention_date.split('T')[0] : '',
          easily_upset_stomach: Boolean(dog.health.easily_upset_stomach),
          easily_hurts_legs: Boolean(dog.health.easily_hurts_legs),
          allergies: dog.health.allergies || '',
          medical_history: dog.health.medical_history || '',
        })
      }
      if (dog.personality) {
        setPersonality({
          personality_description: dog.personality.personality_description || '',
          dog_compatibility: dog.personality.dog_compatibility || '',
          human_reaction: dog.personality.human_reaction || '',
          likes: dog.personality.likes || '',
          dislikes: dog.personality.dislikes || '',
          toilet_status: dog.personality.toilet_status || '',
          crate_training: dog.personality.crate_training || '',
        })
      }

      // 生活情報を別APIで取得（404は無視）
      try {
        const lifestyleRes = await api.get(`/dog-lifestyles/${id}`)
        const ls = lifestyleRes.data
        const toiletEnvironments = Array.isArray(ls.toilet_environments)
          ? ls.toilet_environments
          : ls.toilet_environment
            ? [ls.toilet_environment]
            : []
        setLifestyle({
          praise_words: Array.isArray(ls.praise_words) ? ls.praise_words : [],
          praise_words_other: ls.praise_words_other || '',
          toilet_signal: Array.isArray(ls.toilet_signal) ? ls.toilet_signal : [],
          toilet_signal_other: ls.toilet_signal_other || '',
          rest_environments: Array.isArray(ls.rest_environments) ? ls.rest_environments : [],
          toilet_environments: toiletEnvironments,
          toilet_training: Array.isArray(ls.toilet_training) ? ls.toilet_training : [],
          urination_count_per_day: ls.urination_count_per_day !== null && ls.urination_count_per_day !== undefined
            ? String(ls.urination_count_per_day) : '',
          defecation_count_per_day: ls.defecation_count_per_day !== null && ls.defecation_count_per_day !== undefined
            ? String(ls.defecation_count_per_day) : '',
          toilet_timing_notes: ls.toilet_timing_notes || '',
          has_lunch: Boolean(ls.has_lunch),
          lunch_time: ls.lunch_time ? String(ls.lunch_time).slice(0, 5) : '',
          treat_experience: Array.isArray(ls.treat_experience) ? ls.treat_experience : [],
          treat_other_notes: ls.treat_other_notes || '',
          other_concerns: ls.other_concerns || '',
        })
      } catch {
        // 未登録は無視
      }
    } catch {
      showToast('ワンちゃん情報の取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 記録から写真を取得（軽量API使用）
  const fetchRecordPhotos = async () => {
    setLoadingPhotos(true)
    try {
      // 専用の軽量APIエンドポイントを使用
      const response = await api.get(`/records/photos/${id}`)
      const data = Array.isArray(response.data) ? response.data : []
      setRecordPhotos(data)
    } catch {
      setRecordPhotos([])
      showToast('日誌の写真を取得できませんでした', 'error')
    } finally {
      setLoadingPhotos(false)
    }
  }

  // プロフィール写真をアップロード
  const handlePhotoUpload = async (file: File) => {
    setUploading('photo')
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/uploads?category=dog-photos', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.url) {
        setForm(prev => ({ ...prev, photo_url: response.data.url }))
      }
    } catch {
      showToast('写真のアップロードに失敗しました', 'error')
    } finally {
      setUploading(null)
    }
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handlePhotoUpload(file)
    }
  }

  // 記録の写真を選択
  const handleSelectRecordPhoto = (url: string) => {
    setForm(prev => ({ ...prev, photo_url: url }))
    setShowPhotoModal(false)
  }

  // 写真選択モーダルを開く
  const openPhotoModal = () => {
    fetchRecordPhotos()
    setShowPhotoModal(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleRemovePhoto = () => {
    setForm((prev) => ({ ...prev, photo_url: '' }))
  }

  const handleHealthChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setHealth((prev) => ({ ...prev, [name]: value }))
  }

  const handlePersonalityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setPersonality((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (file: File, type: 'mixed' | 'rabies') => {
    setUploading(type)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/uploads?category=vaccine-certs', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      if (response.data.url) {
        if (type === 'mixed') {
          setHealth(prev => ({
            ...prev,
            mixed_vaccine_cert_url: response.data.url,
            mixed_vaccine_cert_access_url: response.data.accessUrl || response.data.url,
            mixed_vaccine_cert_private: response.data.visibility === 'private',
          }))
        } else {
          setHealth(prev => ({
            ...prev,
            rabies_vaccine_cert_url: response.data.url,
            rabies_vaccine_cert_access_url: response.data.accessUrl || response.data.url,
            rabies_vaccine_cert_private: response.data.visibility === 'private',
          }))
        }
      }
    } catch {
      showToast('ファイルのアップロードに失敗しました', 'error')
    } finally {
      setUploading(null)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'mixed' | 'rabies') => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file, type)
    }
  }

  const handleRemoveFile = async (type: 'mixed' | 'rabies') => {
    const url = type === 'mixed' ? health.mixed_vaccine_cert_url : health.rabies_vaccine_cert_url
    if (!url) return

    try {
      await api.delete('/uploads', { data: { url } })
    } catch {
      // ファイルが存在しなくても続行
    } finally {
      if (type === 'mixed') {
        setHealth(prev => ({
          ...prev,
          mixed_vaccine_cert_url: '',
          mixed_vaccine_cert_access_url: '',
          mixed_vaccine_cert_private: false,
        }))
      } else {
        setHealth(prev => ({
          ...prev,
          rabies_vaccine_cert_url: '',
          rabies_vaccine_cert_access_url: '',
          rabies_vaccine_cert_private: false,
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.breed) {
      showToast('名前と犬種は必須です', 'warning')
      return
    }

    setSaving(true)
    try {
      const healthPayload = {
        mixed_vaccine_date: health.mixed_vaccine_date,
        mixed_vaccine_cert_url: health.mixed_vaccine_cert_url,
        rabies_vaccine_date: health.rabies_vaccine_date,
        rabies_vaccine_cert_url: health.rabies_vaccine_cert_url,
        flea_tick_date: health.flea_tick_date,
        flea_tick_prevention: health.flea_tick_prevention,
        heartworm_prevention: health.heartworm_prevention,
        heartworm_prevention_date: health.heartworm_prevention_date,
        easily_upset_stomach: health.easily_upset_stomach,
        easily_hurts_legs: health.easily_hurts_legs,
        allergies: health.allergies,
        medical_history: health.medical_history,
      }

      await api.put(`/dogs/${id}`, {
        name: form.name,
        name_kana: form.name_kana || null,
        breed: form.breed,
        birth_date: form.birth_date,
        gender: form.gender,
        weight: form.weight ? parseFloat(form.weight) : null,
        color: form.color,
        neutered: form.neutered,
        photo_url: form.photo_url || null,
        dog_tag_number: form.dog_tag_number || null,
        microchip_number: form.microchip_number || null,
        health: healthPayload,
        personality,
      })

      // 生活情報を別APIで UPSERT（送信エラーがあってもメイン保存は完了扱い）
      try {
        await api.put(`/dog-lifestyles/${id}`, {
          praise_words: lifestyle.praise_words,
          praise_words_other: lifestyle.praise_words_other || null,
          toilet_signal: lifestyle.toilet_signal,
          toilet_signal_other: lifestyle.toilet_signal_other || null,
          rest_environments: lifestyle.rest_environments,
          toilet_environments: lifestyle.toilet_environments,
          toilet_training: lifestyle.toilet_training,
          urination_count_per_day: lifestyle.urination_count_per_day ? Number(lifestyle.urination_count_per_day) : null,
          defecation_count_per_day: lifestyle.defecation_count_per_day ? Number(lifestyle.defecation_count_per_day) : null,
          toilet_timing_notes: lifestyle.toilet_timing_notes || null,
          has_lunch: lifestyle.has_lunch,
          lunch_time: lifestyle.has_lunch && lifestyle.lunch_time ? lifestyle.lunch_time : null,
          treat_experience: lifestyle.treat_experience,
          treat_other_notes: lifestyle.treat_other_notes || null,
          other_concerns: lifestyle.other_concerns || null,
        })
      } catch {
        showToast('基本情報は保存しましたが、生活情報の保存に失敗しました', 'warning')
      }
      navigate(`/dogs/${id}`)
    } catch {
      showToast('更新に失敗しました', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  const getFileUrl = (url: string) => {
    if (!url) return ''
    // 絶対URLの場合はそのまま、相対URLの場合はAPIベースURLを追加
    if (url.startsWith('http')) return url
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${url}`
  }

  return (
    <div className="pb-6">
      <SwipeDownHeader
        onDismiss={() => navigate(`/dogs/${id}`)}
        className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border safe-area-pt"
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/dogs/${id}`)}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted active:scale-95 transition-all"
            >
              <Icon icon="solar:close-circle-linear" width="24" height="24" />
            </button>
            <h1 className="text-lg font-bold font-heading">ワンちゃん情報の編集</h1>
          </div>
        </div>
      </SwipeDownHeader>

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        <DogEditBasicInfo
          data={form}
          uploading={uploading}
          photoInputRef={photoInputRef}
          onChange={handleChange}
          onPhotoSelect={handlePhotoSelect}
          onOpenPhotoModal={openPhotoModal}
          onRemovePhoto={handleRemovePhoto}
          getFileUrl={getFileUrl}
        />

        <DogEditHealth
          data={health}
          uploading={uploading}
          mixedVaccineInputRef={mixedVaccineInputRef}
          rabiesVaccineInputRef={rabiesVaccineInputRef}
          onChange={handleHealthChange}
          onFileSelect={handleFileSelect}
          onRemoveFile={handleRemoveFile}
          onHealthFieldChange={(field, value) => setHealth((prev) => ({ ...prev, [field]: value }))}
          getFileUrl={getFileUrl}
        />

        <DogEditPersonality
          data={personality}
          onChange={handlePersonalityChange}
        />

        <DogEditLifestyle
          data={lifestyle}
          onChange={setLifestyle}
        />

        {/* 保存ボタン */}
        <div className="pt-4 space-y-3">
          <button
            type="submit"
            disabled={saving || deleting}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              '保存中...'
            ) : (
              <>
                <Icon icon="solar:check-circle-bold" width="20" height="20" />
                保存する
              </>
            )}
          </button>

          {/* 削除ボタン */}
          <button
            type="button"
            disabled={saving || deleting}
            onClick={async () => {
              const ok = await confirm({
                title: 'ワンちゃんを削除しますか？',
                message: `${form.name || 'このワンちゃん'} の情報を削除します。関連する予約・記録はそのまま残りますが、新しい予約は作成できなくなります。`,
                confirmLabel: '削除する',
                cancelLabel: 'キャンセル',
                variant: 'destructive',
              })
              if (!ok) return
              setDeleting(true)
              try {
                await api.delete(`/dogs/${id}`)
                showToast('ワンちゃんを削除しました', 'success')
                navigate('/dogs')
              } catch {
                showToast('削除に失敗しました', 'error')
              } finally {
                setDeleting(false)
              }
            }}
            className="w-full border border-destructive/40 text-destructive py-3 rounded-xl text-sm font-bold hover:bg-destructive/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {deleting ? (
              '削除中...'
            ) : (
              <>
                <Icon icon="solar:trash-bin-minimalistic-bold" width="20" height="20" />
                ワンちゃんを削除
              </>
            )}
          </button>
        </div>

        <div className="pb-8" />
      </form>
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />

      {/* 記録写真選択モーダル */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPhotoModal(false)}
          ></div>
          <div className="relative bg-background rounded-t-3xl w-full max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between safe-area-pt">
              <h3 className="text-lg font-bold">記録の写真から選択</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted active:scale-95 transition-all"
              >
                <Icon icon="solar:close-circle-linear" width="24" height="24" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {loadingPhotos ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon="solar:spinner-bold" width="32" height="32" className="animate-spin text-primary" />
                </div>
              ) : recordPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon icon="solar:gallery-linear" width="48" height="48" className="text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">記録に写真がありません</p>
                  <p className="text-xs text-muted-foreground mt-1">記録作成時に写真を追加すると、ここに表示されます</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {recordPhotos.map((photo, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectRecordPhoto(photo.url)}
                      className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary active:scale-[0.98] transition-all"
                    >
                      <img
                        src={getFileUrl(photo.url)}
                        alt={`記録写真 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DogEdit
