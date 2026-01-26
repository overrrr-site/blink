import { useState, useEffect } from 'react'
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
  display_order: string
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
    display_order: '0',
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
        display_order: response.data.display_order?.toString() || '0',
        enabled: response.data.enabled !== false,
      })
    } catch (error) {
      console.error('Error fetching training item:', error)
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
        display_order: parseInt(form.display_order, 10) || 0,
        enabled: form.enabled,
      }

      if (isEditing) {
        await api.put(`/training-masters/${id}`, payload)
      } else {
        await api.post('/training-masters', payload)
      }

      navigate('/settings')
    } catch (error: unknown) {
      console.error('Error saving training item:', error)
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
            <iconify-icon icon="solar:checklist-bold" className="text-chart-2 size-4"></iconify-icon>
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
            <div>
              <label className="block text-xs text-muted-foreground mb-1">表示順序</label>
              <input
                type="number"
                name="display_order"
                value={form.display_order}
                onChange={handleChange}
                min="0"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={form.enabled}
                  onChange={handleChange}
                  className="size-4 rounded border-border"
                />
                <span className="text-xs text-muted-foreground">有効</span>
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
