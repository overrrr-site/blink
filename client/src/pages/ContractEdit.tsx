import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'

const CONTRACT_TYPES = ['月謝制', 'チケット制', '単発'] as const

interface ContractForm {
  contract_type: string
  course_name: string
  total_sessions: string
  remaining_sessions: string
  valid_until: string
  monthly_sessions: string
  price: string
}

function ContractEdit(): JSX.Element {
  const { dogId, id } = useParams<{ dogId: string; id?: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<ContractForm>({
    contract_type: '月謝制',
    course_name: '',
    total_sessions: '',
    remaining_sessions: '',
    valid_until: '',
    monthly_sessions: '',
    price: '',
  })

  const isEditing = Boolean(id)
  const isMonthlyType = form.contract_type === '月謝制'
  const isTicketType = form.contract_type === 'チケット制'

  useEffect(() => {
    if (id) {
      fetchContract()
    }
  }, [id])

  async function fetchContract(): Promise<void> {
    try {
      setLoading(true)
      const response = await api.get(`/contracts/${id}`)
      const contract = response.data
      setForm({
        contract_type: contract.contract_type,
        course_name: contract.course_name || '',
        total_sessions: contract.total_sessions?.toString() || '',
        remaining_sessions: contract.remaining_sessions?.toString() || '',
        valid_until: contract.valid_until ? contract.valid_until.split('T')[0] : '',
        monthly_sessions: contract.monthly_sessions?.toString() || '',
        price: contract.price?.toString() || '',
      })
    } catch (error) {
      console.error('Error fetching contract:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>): void {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e?: React.FormEvent): Promise<void> {
    if (e) {
      e.preventDefault()
    }
    setSaving(true)

    try {
      const payload = {
        dog_id: parseInt(dogId!, 10),
        contract_type: form.contract_type,
        course_name: form.course_name || null,
        total_sessions: form.total_sessions ? parseInt(form.total_sessions, 10) : null,
        remaining_sessions: form.remaining_sessions ? parseInt(form.remaining_sessions, 10) : null,
        valid_until: form.valid_until || null,
        monthly_sessions: form.monthly_sessions ? parseInt(form.monthly_sessions, 10) : null,
        price: form.price ? parseFloat(form.price) : null,
      }

      if (isEditing) {
        await api.put(`/contracts/${id}`, payload)
      } else {
        await api.post('/contracts', payload)
      }

      navigate(`/dogs/${dogId}`)
    } catch (error: unknown) {
      console.error('Error saving contract:', error)
      const err = error as { response?: { data?: { error?: string } } }
      alert(err.response?.data?.error || '契約の保存に失敗しました')
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
        title={isEditing ? '契約編集' : '新規契約'}
        backPath={`/dogs/${dogId}`}
      />

      <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
        {/* 契約タイプ */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <iconify-icon icon="solar:tag-bold" className="text-chart-4 size-4"></iconify-icon>
            契約タイプ
          </h3>
          <select
            name="contract_type"
            value={form.contract_type}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            {CONTRACT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </section>

        {/* コース情報 */}
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
            <iconify-icon icon="solar:document-bold" className="text-primary size-4"></iconify-icon>
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
                placeholder="例: 週2回コース"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            {isMonthlyType && (
              <div>
                <label className="block text-xs text-muted-foreground mb-1">月あたり回数</label>
                <input
                  type="number"
                  name="monthly_sessions"
                  value={form.monthly_sessions}
                  onChange={handleChange}
                  placeholder="例: 8"
                  min="1"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}

            {isTicketType && (
              <>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">総回数</label>
                  <input
                    type="number"
                    name="total_sessions"
                    value={form.total_sessions}
                    onChange={handleChange}
                    placeholder="例: 10"
                    min="1"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">残回数</label>
                  <input
                    type="number"
                    name="remaining_sessions"
                    value={form.remaining_sessions}
                    onChange={handleChange}
                    placeholder="例: 10"
                    min="0"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">有効期限</label>
                  <input
                    type="date"
                    name="valid_until"
                    value={form.valid_until}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    未指定の場合は発行日から3ヶ月後に自動設定されます
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs text-muted-foreground mb-1">料金（税込）</label>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="例: 44000"
                min="0"
                step="1"
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>
        </section>
      </form>

      <SaveButton
        saving={saving}
        label={isEditing ? '更新する' : '契約を登録する'}
        onClick={() => handleSubmit()}
      />
    </div>
  )
}

export default ContractEdit
