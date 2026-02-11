import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'
import { useToast } from '../components/Toast'

interface CourseForm {
  course_name: string
  contract_type: string
  sessions: string
  price: string
  valid_days: string
  enabled: boolean
}

function CourseEdit(): JSX.Element {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CourseForm>({
    course_name: '',
    contract_type: '月謝制',
    sessions: '',
    price: '',
    valid_days: '',
    enabled: true,
  })

  const isEditing = Boolean(id)
  const isTicketType = form.contract_type === 'チケット制'

  useEffect(() => {
    if (id) {
      fetchCourse()
    }
  }, [id])

  async function fetchCourse(): Promise<void> {
    try {
      setLoading(true)
      const response = await api.get(`/course-masters/${id}`)
      setForm({
        course_name: response.data.course_name || '',
        contract_type: response.data.contract_type,
        sessions: response.data.sessions?.toString() || '',
        price: response.data.price?.toString() || '',
        valid_days: response.data.valid_days?.toString() || '',
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
        course_name: form.course_name,
        contract_type: form.contract_type,
        sessions: form.sessions ? parseInt(form.sessions, 10) : null,
        price: form.price ? parseFloat(form.price) : null,
        valid_days: form.valid_days ? parseInt(form.valid_days, 10) : null,
        enabled: form.enabled,
      }

      if (isEditing) {
        await api.put(`/course-masters/${id}`, payload)
      } else {
        await api.post('/course-masters', payload)
      }

      navigate('/settings')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'コースの保存に失敗しました', 'error')
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
        title={isEditing ? 'コース編集' : '新規コース'}
        backPath="/settings"
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <Icon icon="solar:tag-price-bold" className="text-chart-4 size-4" />
            コース情報
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">コース名</label>
              <input
                type="text"
                name="course_name"
                value={form.course_name}
                onChange={handleChange}
                required
                placeholder="例: 週2回コース"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">契約タイプ</label>
              <select
                name="contract_type"
                value={form.contract_type}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="月謝制">月謝制</option>
                <option value="チケット制">チケット制</option>
                <option value="単発">単発</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                {form.contract_type === '月謝制' ? '月あたり回数' : '回数'}
              </label>
              <input
                type="number"
                name="sessions"
                value={form.sessions}
                onChange={handleChange}
                min="1"
                placeholder="例: 8"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            {isTicketType && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">有効期限（日数）</label>
                <input
                  type="number"
                  name="valid_days"
                  value={form.valid_days}
                  onChange={handleChange}
                  min="1"
                  placeholder="例: 90"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-muted-foreground mb-1">料金（税込）</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="0"
                step="1"
                placeholder="例: 44000"
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
        label={isEditing ? '更新する' : 'コースを登録する'}
        onClick={() => handleSubmit()}
      />
    </div>
  )
}

export default CourseEdit
