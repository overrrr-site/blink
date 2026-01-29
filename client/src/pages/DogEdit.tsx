import { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import DogEditBasicInfo from '../components/dogs/DogEditBasicInfo'
import DogEditHealth from '../components/dogs/DogEditHealth'
import DogEditPersonality from '../components/dogs/DogEditPersonality'
import type { DogFormData, DogHealthData, DogPersonalityData } from '../components/dogs/types'

interface JournalPhoto {
  url: string
  date: string
}

const DogEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [journalPhotos, setJournalPhotos] = useState<JournalPhoto[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const mixedVaccineInputRef = useRef<HTMLInputElement>(null)
  const rabiesVaccineInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<DogFormData>({
    name: '',
    breed: '',
    birth_date: '',
    gender: 'オス',
    weight: '',
    color: '',
    neutered: '',
    photo_url: '',
  })
  const [health, setHealth] = useState<DogHealthData>({
    mixed_vaccine_date: '',
    mixed_vaccine_cert_url: '',
    rabies_vaccine_date: '',
    rabies_vaccine_cert_url: '',
    flea_tick_date: '',
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
        breed: dog.breed || '',
        birth_date: dog.birth_date ? dog.birth_date.split('T')[0] : '',
        gender: dog.gender || 'オス',
        weight: dog.weight?.toString() || '',
        color: dog.color || '',
        neutered: dog.neutered || '',
        photo_url: dog.photo_url || '',
      })
      if (dog.health) {
        setHealth({
          mixed_vaccine_date: dog.health.mixed_vaccine_date ? dog.health.mixed_vaccine_date.split('T')[0] : '',
          mixed_vaccine_cert_url: dog.health.mixed_vaccine_cert_url || '',
          rabies_vaccine_date: dog.health.rabies_vaccine_date ? dog.health.rabies_vaccine_date.split('T')[0] : '',
          rabies_vaccine_cert_url: dog.health.rabies_vaccine_cert_url || '',
          flea_tick_date: dog.health.flea_tick_date ? dog.health.flea_tick_date.split('T')[0] : '',
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
    } catch {
      alert('ワンちゃん情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 日誌から写真を取得（軽量API使用）
  const fetchJournalPhotos = async () => {
    setLoadingPhotos(true)
    try {
      // 専用の軽量APIエンドポイントを使用
      const response = await api.get(`/journals/photos/${id}`)
      setJournalPhotos(response.data)
    } catch {
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
      alert('写真のアップロードに失敗しました')
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

  // 日誌の写真を選択
  const handleSelectJournalPhoto = (url: string) => {
    setForm(prev => ({ ...prev, photo_url: url }))
    setShowPhotoModal(false)
  }

  // 写真選択モーダルを開く
  const openPhotoModal = () => {
    fetchJournalPhotos()
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
          setHealth(prev => ({ ...prev, mixed_vaccine_cert_url: response.data.url }))
        } else {
          setHealth(prev => ({ ...prev, rabies_vaccine_cert_url: response.data.url }))
        }
      }
    } catch {
      alert('ファイルのアップロードに失敗しました')
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
        setHealth(prev => ({ ...prev, mixed_vaccine_cert_url: '' }))
      } else {
        setHealth(prev => ({ ...prev, rabies_vaccine_cert_url: '' }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.breed) {
      alert('名前と犬種は必須です')
      return
    }

    setSaving(true)
    try {
      await api.put(`/dogs/${id}`, {
        name: form.name,
        breed: form.breed,
        birth_date: form.birth_date,
        gender: form.gender,
        weight: form.weight ? parseFloat(form.weight) : null,
        color: form.color,
        neutered: form.neutered,
        photo_url: form.photo_url || null,
        health,
        personality,
      })
      navigate(`/dogs/${id}`)
    } catch {
      alert('更新に失敗しました')
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
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/dogs/${id}`)}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <Icon icon="solar:close-circle-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">ワンちゃん情報の編集</h1>
        </div>
      </header>

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
          getFileUrl={getFileUrl}
        />

        <DogEditPersonality
          data={personality}
          onChange={handlePersonalityChange}
        />

        {/* 保存ボタン */}
        <div className="pt-4 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
        </div>
      </form>

      {/* 日誌写真選択モーダル */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowPhotoModal(false)}
          ></div>
          <div className="relative bg-background rounded-t-3xl w-full max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom">
            <div className="sticky top-0 bg-background border-b border-border px-5 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">日誌の写真から選択</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="size-10 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
              >
                <Icon icon="solar:close-circle-linear" width="24" height="24" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {loadingPhotos ? (
                <div className="flex items-center justify-center py-12">
                  <Icon icon="solar:spinner-bold" width="32" height="32" className="animate-spin text-primary" />
                </div>
              ) : journalPhotos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Icon icon="solar:gallery-linear" width="48" height="48" className="text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">日誌に写真がありません</p>
                  <p className="text-xs text-muted-foreground mt-1">日誌作成時に写真を追加すると、ここに表示されます</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {journalPhotos.map((photo, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectJournalPhoto(photo.url)}
                      className="aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-colors"
                    >
                      <img
                        src={getFileUrl(photo.url)}
                        alt={`日誌写真 ${index + 1}`}
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
