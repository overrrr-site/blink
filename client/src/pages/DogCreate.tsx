import { useState, useRef } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

const DogCreate = () => {
  const { ownerId } = useParams<{ ownerId: string }>()
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const mixedVaccineInputRef = useRef<HTMLInputElement>(null)
  const rabiesVaccineInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '',
    breed: '',
    birth_date: '',
    gender: 'オス',
    weight: '',
    color: '',
    neutered: '',
    photo_url: '',
  })
  const [health, setHealth] = useState({
    mixed_vaccine_date: '',
    mixed_vaccine_cert_url: '',
    rabies_vaccine_date: '',
    rabies_vaccine_cert_url: '',
    flea_tick_date: '',
    allergies: '',
    medical_history: '',
  })

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleHealthChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setHealth((prev) => ({ ...prev, [name]: value }))
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.breed || !form.birth_date || !form.gender) {
      alert('名前、犬種、生年月日、性別は必須です')
      return
    }

    if (!ownerId) {
      alert('飼い主IDが取得できませんでした')
      return
    }

    setSaving(true)
    try {
      await api.post('/dogs', {
        owner_id: ownerId,
        name: form.name,
        breed: form.breed,
        birth_date: form.birth_date,
        gender: form.gender,
        weight: form.weight ? parseFloat(form.weight) : null,
        color: form.color,
        neutered: form.neutered,
        photo_url: form.photo_url || null,
        health: Object.keys(health).some(key => health[key as keyof typeof health]) ? health : null,
      })
      navigate(`/owners/${ownerId}`)
    } catch {
      alert('登録に失敗しました')
    } finally {
      setSaving(false)
    }
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
            onClick={() => navigate(`/owners/${ownerId}`)}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <Icon icon="solar:close-circle-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">新規犬登録</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* プロフィール写真 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <Icon icon="solar:camera-bold" width="16" height="16" className="text-primary" />
            プロフィール写真
          </h3>

          <div className="flex flex-col items-center gap-4">
            {/* 写真プレビュー */}
            <div className="relative">
              {form.photo_url ? (
                <div className="relative">
                  <img
                    src={getFileUrl(form.photo_url)}
                    alt={form.name || 'プロフィール写真'}
                    className="size-32 rounded-full object-cover border-4 border-primary/20"
                  />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, photo_url: '' }))}
                    className="absolute -top-2 -right-2 size-8 rounded-full bg-destructive text-white flex items-center justify-center shadow-lg"
                  >
                    <Icon icon="solar:close-circle-bold" width="20" height="20" />
                  </button>
                </div>
              ) : (
                <div className="size-32 rounded-full bg-muted flex items-center justify-center border-4 border-dashed border-border">
                  <Icon icon="solar:paw-print-bold" width="48" height="48" className="text-muted-foreground" />
                </div>
              )}
            </div>

            {/* アップロードボタン */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploading === 'photo'}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-primary bg-primary/10 text-sm text-primary font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {uploading === 'photo' ? (
                <>
                  <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                  アップロード中...
                </>
              ) : (
                <>
                  <Icon icon="solar:camera-add-bold" width="20" height="20" />
                  写真をアップロード
                </>
              )}
            </button>
          </div>
        </section>

        {/* 基本情報 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <Icon icon="solar:paw-print-bold" width="16" height="16" className="text-primary" />
            基本情報
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                名前 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="もも"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                犬種 <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="breed"
                value={form.breed}
                onChange={handleChange}
                placeholder="トイプードル"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  性別 <span className="text-destructive">*</span>
                </label>
                <select
                  name="gender"
                  value={form.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="オス">オス</option>
                  <option value="メス">メス</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  生年月日 <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  name="birth_date"
                  value={form.birth_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">体重 (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={form.weight}
                  onChange={handleChange}
                  step="0.1"
                  placeholder="4.5"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">毛色</label>
                <input
                  type="text"
                  name="color"
                  value={form.color}
                  onChange={handleChange}
                  placeholder="アプリコット"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">去勢・避妊</label>
              <select
                name="neutered"
                value={form.neutered}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">未設定</option>
                <option value="済">済み</option>
                <option value="未">未</option>
              </select>
            </div>
          </div>
        </section>

        {/* 健康情報 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <Icon icon="solar:health-bold" width="16" height="16" className="text-chart-2" />
            健康情報
          </h3>

          <div className="space-y-4">
            {/* 混合ワクチン */}
            <div className="bg-muted/30 rounded-xl p-4">
              <label className="block text-xs font-bold text-foreground mb-2">
                混合ワクチン
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">接種日</label>
                  <input
                    type="date"
                    name="mixed_vaccine_date"
                    value={health.mixed_vaccine_date}
                    onChange={handleHealthChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">証明書</label>
                  <input
                    ref={mixedVaccineInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e, 'mixed')}
                    className="hidden"
                  />
                  {health.mixed_vaccine_cert_url ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={getFileUrl(health.mixed_vaccine_cert_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-chart-2 bg-chart-2/10 text-sm text-chart-2 hover:bg-chart-2/20 transition-colors"
                      >
                        <Icon icon="solar:file-check-bold" width="20" height="20" />
                        <span className="truncate">証明書をプレビュー</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setHealth(prev => ({ ...prev, mixed_vaccine_cert_url: '' }))}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" width="20" height="20" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => mixedVaccineInputRef.current?.click()}
                      disabled={uploading === 'mixed'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {uploading === 'mixed' ? (
                        <>
                          <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:upload-bold" width="20" height="20" />
                          証明書をアップロード
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 狂犬病ワクチン */}
            <div className="bg-muted/30 rounded-xl p-4">
              <label className="block text-xs font-bold text-foreground mb-2">
                狂犬病予防接種
              </label>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">接種日</label>
                  <input
                    type="date"
                    name="rabies_vaccine_date"
                    value={health.rabies_vaccine_date}
                    onChange={handleHealthChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">証明書</label>
                  <input
                    ref={rabiesVaccineInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(e, 'rabies')}
                    className="hidden"
                  />
                  {health.rabies_vaccine_cert_url ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={getFileUrl(health.rabies_vaccine_cert_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border border-chart-2 bg-chart-2/10 text-sm text-chart-2 hover:bg-chart-2/20 transition-colors"
                      >
                        <Icon icon="solar:file-check-bold" width="20" height="20" />
                        <span className="truncate">証明書をプレビュー</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setHealth(prev => ({ ...prev, rabies_vaccine_cert_url: '' }))}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Icon icon="solar:trash-bin-trash-bold" width="20" height="20" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => rabiesVaccineInputRef.current?.click()}
                      disabled={uploading === 'rabies'}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {uploading === 'rabies' ? (
                        <>
                          <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <Icon icon="solar:upload-bold" width="20" height="20" />
                          証明書をアップロード
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">ノミ・ダニ予防日</label>
              <input
                type="date"
                name="flea_tick_date"
                value={health.flea_tick_date}
                onChange={handleHealthChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">アレルギー</label>
              <input
                type="text"
                name="allergies"
                value={health.allergies}
                onChange={handleHealthChange}
                placeholder="特になし"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">既往歴</label>
              <textarea
                name="medical_history"
                value={health.medical_history}
                onChange={handleHealthChange}
                placeholder="過去の病歴など"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
          </div>
        </section>

        {/* 保存ボタン */}
        <div className="pt-4 pb-8">
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              '登録中...'
            ) : (
              <>
                <Icon icon="solar:check-circle-bold" width="20" height="20" />
                登録する
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DogCreate
