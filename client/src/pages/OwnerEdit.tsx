import { useState, useEffect } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/client'
import { useToast } from '../components/Toast'
import OwnerForm, { OwnerFormValues } from '../components/OwnerForm'
import { useAuthStore } from '../store/authStore'
import type { RecordType } from '../types/record'

const OwnerEdit = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [initialValues, setInitialValues] = useState<Partial<OwnerFormValues>>({})
  const businessTypes = useAuthStore((s) => s.user?.businessTypes) as RecordType[] | undefined

  useEffect(() => {
    if (id) {
      fetchOwner()
    }
  }, [id])

  const fetchOwner = async () => {
    try {
      const response = await api.get(`/owners/${id}`)
      const owner = response.data
      setInitialValues({
        name: owner.name || '',
        name_kana: owner.name_kana || '',
        phone: owner.phone || '',
        email: owner.email || '',
        address: owner.address || '',
        emergency_contact_name: owner.emergency_contact || owner.emergency_contact_name || '',
        emergency_contact_phone: owner.emergency_picker || owner.emergency_contact_phone || '',
        notes: owner.memo || owner.notes || '',
        business_types: Array.isArray(owner.business_types) ? owner.business_types : [],
      })
    } catch {
      showToast('飼い主情報の取得に失敗しました', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values: OwnerFormValues) => {
    if (!values.name || !values.phone) {
      showToast('氏名と電話番号は必須です', 'warning')
      return
    }

    setSaving(true)
    try {
      await api.put(`/owners/${id}`, {
        name: values.name,
        name_kana: values.name_kana || null,
        phone: values.phone,
        email: values.email || null,
        address: values.address || null,
        emergency_contact: values.emergency_contact_name || null,
        emergency_picker: values.emergency_contact_phone || null,
        memo: values.notes || null,
        business_types: values.business_types,
      })
      navigate(`/owners/${id}`)
    } catch {
      showToast('更新に失敗しました', 'error')
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
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between safe-area-pt">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/owners/${id}`)}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <Icon icon="solar:close-circle-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">飼い主情報の編集</h1>
        </div>
      </header>

      <OwnerForm
        initialValues={initialValues}
        onSubmit={handleSubmit}
        loading={saving}
        submitLabel="保存する"
        availableBusinessTypes={businessTypes}
      />
    </div>
  )
}

export default OwnerEdit
