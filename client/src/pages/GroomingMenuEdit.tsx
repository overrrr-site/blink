import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'

const DOG_SIZES = ['全サイズ', '小型', '中型', '大型'] as const

interface GroomingMenuForm {
  menu_name: string
  description: string
  price: string
  duration_minutes: string
  dog_size: string
  enabled: boolean
}

function GroomingMenuEdit(): JSX.Element {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<GroomingMenuForm>({
    menu_name: '',
    description: '',
    price: '',
    duration_minutes: '60',
    dog_size: '全サイズ',
    enabled: true,
  })

  const isEditing = Boolean(id)

  useEffect(() => {
    if (id) {
      fetchMenu()
    }
  }, [id])

  async function fetchMenu(): Promise<void> {
    try {
      setLoading(true)
      const response = await api.get(`/grooming-menus/${id}`)
      setForm({
        menu_name: response.data.menu_name || '',
        description: response.data.description || '',
        price: response.data.price?.toString() || '',
        duration_minutes: response.data.duration_minutes?.toString() || '60',
        dog_size: response.data.dog_size || '全サイズ',
        enabled: response.data.enabled !== false,
      })
    } catch {
      alert('メニューの取得に失敗しました')
      navigate('/settings')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void {
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
        menu_name: form.menu_name,
        description: form.description || null,
        price: form.price ? parseFloat(form.price) : null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes, 10) : null,
        dog_size: form.dog_size,
        enabled: form.enabled,
      }

      if (isEditing) {
        await api.put(`/grooming-menus/${id}`, payload)
      } else {
        await api.post('/grooming-menus', payload)
      }

      navigate('/settings')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'メニューの保存に失敗しました')
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
        title={isEditing ? '施術メニュー編集' : '新規施術メニュー'}
        backPath="/settings"
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <Icon icon="solar:scissors-bold" className="text-chart-4 size-4" />
            メニュー情報
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">メニュー名 *</label>
              <input
                type="text"
                name="menu_name"
                value={form.menu_name}
                onChange={handleChange}
                required
                placeholder="例: シャンプーコース、フルコース"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">説明</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={2}
                placeholder="例: シャンプー、ブロー、爪切り、耳掃除、肛門腺絞り"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">料金（税込）</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">¥</span>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    placeholder="0"
                    className="w-full pl-8 pr-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">施術時間</label>
                <div className="relative">
                  <input
                    type="number"
                    name="duration_minutes"
                    value={form.duration_minutes}
                    onChange={handleChange}
                    min="15"
                    step="15"
                    placeholder="60"
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">分</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">対象サイズ</label>
              <select
                name="dog_size"
                value={form.dog_size}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {DOG_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground mt-1">
                「全サイズ」を選択すると全サイズ共通のメニューとして表示されます
              </p>
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
                  <span className="text-sm font-medium block">メニューを有効にする</span>
                  <span className="text-[10px] text-muted-foreground">オフにすると予約作成時の選択肢に表示されなくなります</span>
                </div>
              </label>
            </div>
          </div>
        </section>
      </form>

      <SaveButton
        saving={saving}
        label={isEditing ? '更新する' : 'メニューを登録する'}
        onClick={() => handleSubmit()}
      />
    </div>
  )
}

export default GroomingMenuEdit
