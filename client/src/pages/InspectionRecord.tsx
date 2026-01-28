import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

interface Staff {
  id: number
  name: string
}

const InspectionRecord = () => {
  const { date } = useParams<{ date: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [record, setRecord] = useState<any>(null)
  
  const inspectionDate = date || new Date().toISOString().split('T')[0]
  
  const [formData, setFormData] = useState({
    inspection_time: '',
    cleaning_done: false,
    disinfection_done: false,
    maintenance_done: false,
    animal_count_abnormal: false,
    animal_state_abnormal: false,
    inspector_name: '',
    notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [inspectionDate])

  const fetchData = async () => {
    try {
      const [staffRes, recordRes] = await Promise.all([
        api.get('/auth/staff'),
        api.get(`/inspection-records/${inspectionDate}`).catch(() => ({ data: null })),
      ])
      
      setStaffList(staffRes.data)
      
      if (recordRes.data) {
        setRecord(recordRes.data)
        setFormData({
          inspection_time: recordRes.data.inspection_time || '',
          cleaning_done: recordRes.data.cleaning_done || false,
          disinfection_done: recordRes.data.disinfection_done || false,
          maintenance_done: recordRes.data.maintenance_done || false,
          animal_count_abnormal: recordRes.data.animal_count_abnormal || false,
          animal_state_abnormal: recordRes.data.animal_state_abnormal || false,
          inspector_name: recordRes.data.inspector_name || '',
          notes: recordRes.data.notes || '',
        })
      } else {
        // 新規作成の場合、現在のユーザーをデフォルトに設定
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
        if (currentUser.name) {
          setFormData((prev) => ({
            ...prev,
            inspector_name: currentUser.name,
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const payload = {
        inspection_date: inspectionDate,
        inspection_time: formData.inspection_time || null,
        cleaning_done: formData.cleaning_done,
        disinfection_done: formData.disinfection_done,
        maintenance_done: formData.maintenance_done,
        animal_count_abnormal: formData.animal_count_abnormal,
        animal_state_abnormal: formData.animal_state_abnormal,
        inspector_name: formData.inspector_name || null,
        notes: formData.notes || null,
      }

      if (record) {
        await api.put(`/inspection-records/${inspectionDate}`, payload)
      } else {
        await api.post('/inspection-records', payload)
      }
      
      navigate('/dashboard')
    } catch (error) {
      console.error('Error saving inspection record:', error)
      alert('点検記録の保存に失敗しました')
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

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="ダッシュボードに戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <div>
          <h1 className="text-lg font-bold font-heading">点検記録</h1>
          <p className="text-xs text-muted-foreground">
            {new Date(inspectionDate).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </p>
        </div>
      </header>

      <main className="px-5 pt-4 space-y-6">
        {/* 点検時間 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <iconify-icon icon="solar:clock-circle-bold" width="20" height="20" className="text-primary"></iconify-icon>
            点検時間
          </h3>
          <div className="bg-card rounded-xl border border-border p-4">
            <input
              type="time"
              value={formData.inspection_time}
              onChange={(e) => setFormData({ ...formData, inspection_time: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            />
          </div>
        </section>

        {/* 飼養施設の点検 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <iconify-icon icon="solar:home-smile-bold" width="20" height="20" className="text-chart-1"></iconify-icon>
            飼養施設の点検
          </h3>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <iconify-icon icon="solar:broom-bold" width="18" height="18" className="text-chart-2"></iconify-icon>
                <span className="text-sm font-medium">清掃</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, cleaning_done: true })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    formData.cleaning_done
                      ? 'bg-chart-2 text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  済
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, cleaning_done: false })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    !formData.cleaning_done
                      ? 'bg-destructive text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  否
                </button>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <iconify-icon icon="solar:disinfectant-bold" width="18" height="18" className="text-chart-3"></iconify-icon>
                <span className="text-sm font-medium">消毒</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, disinfection_done: true })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    formData.disinfection_done
                      ? 'bg-chart-2 text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  済
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, disinfection_done: false })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    !formData.disinfection_done
                      ? 'bg-destructive text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  否
                </button>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <iconify-icon icon="solar:wrench-bold" width="18" height="18" className="text-chart-4"></iconify-icon>
                <span className="text-sm font-medium">保守点検</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, maintenance_done: true })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    formData.maintenance_done
                      ? 'bg-chart-2 text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  済
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, maintenance_done: false })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    !formData.maintenance_done
                      ? 'bg-destructive text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  否
                </button>
              </div>
            </label>
          </div>
        </section>

        {/* 動物の数及び状態の点検 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <iconify-icon icon="solar:paw-print-bold" width="20" height="20" className="text-chart-5"></iconify-icon>
            動物の数及び状態の点検
          </h3>
          <div className="bg-card rounded-xl border border-border p-4 space-y-3">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <iconify-icon icon="solar:users-group-rounded-bold" width="18" height="18" className="text-chart-2"></iconify-icon>
                <span className="text-sm font-medium">数の異常</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, animal_count_abnormal: true })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    formData.animal_count_abnormal
                      ? 'bg-destructive text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  有
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, animal_count_abnormal: false })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    !formData.animal_count_abnormal
                      ? 'bg-chart-2 text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  無
                </button>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <iconify-icon icon="solar:heart-pulse-bold" width="18" height="18" className="text-chart-3"></iconify-icon>
                <span className="text-sm font-medium">状態の異常</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, animal_state_abnormal: true })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    formData.animal_state_abnormal
                      ? 'bg-destructive text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  有
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, animal_state_abnormal: false })}
                  className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    !formData.animal_state_abnormal
                      ? 'bg-chart-2 text-white ring-2 ring-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  無
                </button>
              </div>
            </label>
          </div>
        </section>

        {/* 点検担当者 */}
        <section>
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <iconify-icon icon="solar:user-bold" width="20" height="20" className="text-primary"></iconify-icon>
            点検担当者氏名
          </h3>
          <div className="bg-card rounded-xl border border-border p-4">
            <select
              value={formData.inspector_name}
              onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
            >
              <option value="">選択してください</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.name}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 備考 */}
        {(formData.animal_count_abnormal || formData.animal_state_abnormal) && (
          <section>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <iconify-icon icon="solar:notes-bold" width="20" height="20" className="text-chart-4"></iconify-icon>
              備考（異常有の内容等）
            </h3>
            <div className="bg-card rounded-xl border border-border p-4">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full h-32 bg-input border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="異常がある場合は、その詳細を記入してください..."
              />
            </div>
          </section>
        )}

        {/* 保存ボタン */}
        <div className="pt-4 pb-8">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="animate-spin"></iconify-icon>
                保存中...
              </>
            ) : (
              <>
                <iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
                点検記録を保存
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

export default InspectionRecord
