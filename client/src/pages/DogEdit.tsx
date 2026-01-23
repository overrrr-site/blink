import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'

const DogEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
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
    } catch (error) {
      console.error('Error fetching dog:', error)
      alert('犬情報の取得に失敗しました')
    } finally {
      setLoading(false)
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
    } catch (error) {
      console.error('Error uploading file:', error)
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
      if (type === 'mixed') {
        setHealth(prev => ({ ...prev, mixed_vaccine_cert_url: '' }))
      } else {
        setHealth(prev => ({ ...prev, rabies_vaccine_cert_url: '' }))
      }
    } catch (error) {
      console.error('Error deleting file:', error)
      // ファイルが存在しなくてもURLをクリア
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
        ...form,
        weight: form.weight ? parseFloat(form.weight) : null,
        health,
      })
      navigate(`/dogs/${id}`)
    } catch (error) {
      console.error('Error updating dog:', error)
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
            <iconify-icon icon="solar:close-circle-linear" width="24" height="24"></iconify-icon>
          </button>
          <h1 className="text-lg font-bold font-heading">犬情報の編集</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* 基本情報 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <iconify-icon icon="solar:paw-print-bold" width="16" height="16" class="text-primary"></iconify-icon>
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
                <label className="block text-xs text-muted-foreground mb-1">性別</label>
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
                <label className="block text-xs text-muted-foreground mb-1">生年月日</label>
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
                <option value="済み">済み</option>
                <option value="未">未</option>
              </select>
            </div>
          </div>
        </section>

        {/* 健康情報 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <iconify-icon icon="solar:health-bold" width="16" height="16" class="text-chart-2"></iconify-icon>
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
                        <iconify-icon icon="solar:file-check-bold" width="20" height="20"></iconify-icon>
                        <span className="truncate">証明書をプレビュー</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile('mixed')}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <iconify-icon icon="solar:trash-bin-trash-bold" width="20" height="20"></iconify-icon>
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
                          <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="animate-spin"></iconify-icon>
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <iconify-icon icon="solar:upload-bold" width="20" height="20"></iconify-icon>
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
                        <iconify-icon icon="solar:file-check-bold" width="20" height="20"></iconify-icon>
                        <span className="truncate">証明書をプレビュー</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile('rabies')}
                        className="min-w-[48px] min-h-[48px] flex items-center justify-center rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <iconify-icon icon="solar:trash-bin-trash-bold" width="20" height="20"></iconify-icon>
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
                          <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="animate-spin"></iconify-icon>
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <iconify-icon icon="solar:upload-bold" width="20" height="20"></iconify-icon>
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
              '保存中...'
            ) : (
              <>
                <iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
                保存する
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default DogEdit
