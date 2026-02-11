import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'
import { useToast } from '../components/Toast'

interface StaffForm {
  name: string
  email: string
  is_owner: boolean
}

function StaffEdit(): JSX.Element {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<StaffForm>({
    name: '',
    email: '',
    is_owner: false,
  })

  useEffect(() => {
    if (!id) {
      // 新規作成ページへのアクセスは招待モーダルを使用するようリダイレクト
      navigate('/settings')
      return
    }
    fetchStaff()
  }, [id, navigate])

  async function fetchStaff(): Promise<void> {
    try {
      setLoading(true)
      const response = await api.get(`/staff/${id}`)
      setForm({
        name: response.data.name,
        email: response.data.email,
        is_owner: response.data.is_owner || false,
      })
    } catch {
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value, type, checked } = e.target
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
      const payload: Record<string, unknown> = {
        name: form.name,
        is_owner: form.is_owner,
      }

      await api.put(`/staff/${id}`, payload)
      navigate('/settings')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      showToast(err.response?.data?.error || 'スタッフの保存に失敗しました', 'error')
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
        title="スタッフ編集"
        backPath="/settings"
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <Icon icon="solar:user-id-bold" className="text-chart-3 size-4" />
            基本情報
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">氏名</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">メールアドレス</label>
              <input
                type="email"
                name="email"
                value={form.email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted text-sm text-muted-foreground cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground mt-1">メールアドレスは変更できません</p>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="is_owner"
                  checked={form.is_owner}
                  onChange={handleChange}
                  className="size-4 rounded border-border"
                />
                <span className="text-xs text-muted-foreground">オーナー（管理者）として登録</span>
              </label>
            </div>
          </div>
        </section>
      </form>

      <SaveButton
        saving={saving}
        label="更新する"
        onClick={() => handleSubmit()}
      />
    </div>
  )
}

export default StaffEdit
