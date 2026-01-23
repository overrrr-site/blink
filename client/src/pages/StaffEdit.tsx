import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'

interface StaffForm {
  name: string
  email: string
  password: string
  is_owner: boolean
}

function StaffEdit(): JSX.Element {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<StaffForm>({
    name: '',
    email: '',
    password: '',
    is_owner: false,
  })

  const isEditing = Boolean(id)

  useEffect(() => {
    if (id) {
      fetchStaff()
    }
  }, [id])

  async function fetchStaff(): Promise<void> {
    try {
      setLoading(true)
      const response = await api.get(`/staff/${id}`)
      setForm({
        name: response.data.name,
        email: response.data.email,
        password: '',
        is_owner: false,
      })
    } catch (error) {
      console.error('Error fetching staff:', error)
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
        email: form.email,
        is_owner: form.is_owner,
      }

      if (form.password) {
        payload.password = form.password
      }

      if (isEditing) {
        await api.put(`/staff/${id}`, payload)
      } else {
        if (!form.password) {
          alert('パスワードを入力してください')
          setSaving(false)
          return
        }
        await api.post('/staff', payload)
      }

      navigate('/settings')
    } catch (error: unknown) {
      console.error('Error saving staff:', error)
      const err = error as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || 'スタッフの保存に失敗しました')
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
        title={isEditing ? 'スタッフ編集' : '新規スタッフ'}
        backPath="/settings"
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <iconify-icon icon="solar:user-id-bold" className="text-chart-3 size-4"></iconify-icon>
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
                onChange={handleChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                パスワード{isEditing ? '（変更する場合のみ）' : ''}
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required={!isEditing}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
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
        label={isEditing ? '更新する' : 'スタッフを登録する'}
        onClick={() => handleSubmit()}
      />
    </div>
  )
}

export default StaffEdit
