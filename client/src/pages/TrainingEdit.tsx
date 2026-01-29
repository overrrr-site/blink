import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'

const TRAINING_CATEGORIES = [
  '基本トレーニング',
  'トイレトレーニング',
  '社会化トレーニング',
  '問題行動対策',
] as const

interface TrainingForm {
  category: string
  item_key: string
  item_label: string
  enabled: boolean
}

function TrainingEdit(): JSX.Element {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TrainingForm>({
    category: '基本トレーニング',
    item_key: '',
    item_label: '',
    enabled: true,
  })

  const isEditing = Boolean(id)

  useEffect(() => {
    if (id) {
      fetchTraining()
    }
  }, [id])

  async function fetchTraining(): Promise<void> {
    try {
      setLoading(true)
      const response = await api.get(`/training-masters/${id}`)
      setForm({
        category: response.data.category || '基本トレーニング',
        item_key: response.data.item_key || '',
        item_label: response.data.item_label || '',
        enabled: response.data.enabled !== false,
      })
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  async function handleSubmit(e?: React.FormEvent): Promise<void> {
    if (e) {
      e.preventDefault()
    }
    setSaving(true)

    try {
      const payload = {
        category: form.category,
        item_key: form.item_key,
        item_label: form.item_label,
        enabled: form.enabled,
      }

      if (isEditing) {
        await api.put(`/training-masters/${id}`, payload)
      } else {
        await api.post('/training-masters', payload)
      }

      navigate('/settings')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'トレーニング項目の保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="pb-32">
      <PageHeader
        title={isEditing ? 'トレーニング項目編集' : '新規トレーニング項目'}
        backPath="/settings"
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <Icon icon="solar:checklist-bold" className="text-chart-2 size-4" />
            項目情報
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">カテゴリ</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {TRAINING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">項目キー（英数字、アンダースコア）</label>
              <input
                type="text"
                name="item_key"
                value={form.item_key}
                onChange={handleChange}
                required
                pattern="[a-z0-9_]+"
                placeholder="例: sit, down, stay"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                システム内部で使用するキー（小文字、英数字、アンダースコアのみ）
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">項目名（表示名）</label>
              <input
                type="text"
                name="item_label"
                value={form.item_label}
                onChange={handleChange}
                required
                placeholder="例: オスワリ、フセ、マテ"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={form.enabled}
                  onChange={handleChange}
                  className="size-5 rounded border-border accent-primary"
                />
                <div>
                  <span className="text-sm font-medium block">日誌で使用する</span>
                  <span className="text-[10px] text-muted-foreground">オフにすると日誌作成時の項目一覧に表示されなくなります</span>
                </div>
              </label>
            </div>
          </div>
        </section>
      </form>

      <SaveButton
        saving={saving}
        label={isEditing ? '更新する' : 'トレーニング項目を登録する'}
        onClick={() => handleSubmit()}
      />
    </div>
  )
}

export default TrainingEdit
