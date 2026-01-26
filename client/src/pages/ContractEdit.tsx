import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import SaveButton from '../components/SaveButton'

const CONTRACT_TYPES = ['月謝制', 'チケット制', '単発'] as const

interface CourseMaster {
  id: number
  course_name: string
  contract_type: string
  sessions: number | null
  price: number | null
  valid_days: number | null
  enabled: boolean
}

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
  const [courseMasters, setCourseMasters] = useState<CourseMaster[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [useCustomCourse, setUseCustomCourse] = useState(false)
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
    fetchCourseMasters()
    if (id) {
      fetchContract()
    }
  }, [id])

  async function fetchCourseMasters(): Promise<void> {
    try {
      const response = await api.get('/course-masters')
      const enabledCourses = response.data.filter((c: CourseMaster) => c.enabled)
      setCourseMasters(enabledCourses)
    } catch (error) {
      console.error('Error fetching course masters:', error)
    }
  }

  function handleCourseSelect(courseId: string): void {
    setSelectedCourseId(courseId)
    
    if (courseId === 'custom') {
      setUseCustomCourse(true)
      return
    }
    
    setUseCustomCourse(false)
    const course = courseMasters.find(c => c.id.toString() === courseId)
    if (course) {
      // コースマスタの情報でフォームを自動入力
      const validUntil = course.valid_days
        ? new Date(Date.now() + course.valid_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : ''
      
      setForm({
        contract_type: course.contract_type,
        course_name: course.course_name,
        total_sessions: course.sessions?.toString() || '',
        remaining_sessions: course.sessions?.toString() || '', // 新規は総回数と同じ
        valid_until: validUntil,
        monthly_sessions: course.contract_type === '月謝制' ? (course.sessions?.toString() || '') : '',
        price: course.price?.toString() || '',
      })
    }
  }

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
        {/* コース選択（新規作成時のみ表示） */}
        {!isEditing && (
          <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
              <iconify-icon icon="solar:clipboard-list-bold" className="text-primary size-4"></iconify-icon>
              コース選択
            </h3>
            {courseMasters.length > 0 ? (
              <>
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">コースを選択してください</option>
                  {courseMasters.map((course) => (
                    <option key={course.id} value={course.id.toString()}>
                      {course.course_name}（{course.contract_type}）
                      {course.price && ` - ¥${course.price.toLocaleString()}`}
                    </option>
                  ))}
                  <option value="custom">カスタム入力...</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-2">
                  設定画面で登録したコースから選択できます
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground mb-2">登録されているコースがありません</p>
                <button
                  type="button"
                  onClick={() => navigate('/settings/courses/new')}
                  className="text-xs text-primary font-bold"
                >
                  コースを登録する
                </button>
              </div>
            )}
          </section>
        )}

        {/* 契約タイプ（カスタム入力または編集時に表示） */}
        {(useCustomCourse || isEditing || courseMasters.length === 0) && (
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
        )}

        {/* コース情報 */}
        {(selectedCourseId || useCustomCourse || isEditing || courseMasters.length === 0) && (
          <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
            <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-3">
              <iconify-icon icon="solar:document-bold" className="text-primary size-4"></iconify-icon>
              コース情報
              {selectedCourseId && selectedCourseId !== 'custom' && (
                <span className="text-[10px] bg-chart-2/10 text-chart-2 px-2 py-0.5 rounded-full">自動入力</span>
              )}
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
                  readOnly={selectedCourseId !== '' && selectedCourseId !== 'custom' && !isEditing}
                  className={`w-full px-4 py-3 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                    selectedCourseId && selectedCourseId !== 'custom' && !isEditing
                      ? 'bg-muted/50 cursor-not-allowed'
                      : 'bg-input'
                  }`}
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
        )}
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
