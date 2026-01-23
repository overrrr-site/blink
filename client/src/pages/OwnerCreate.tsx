import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import OwnerForm, { OwnerFormValues } from '../components/OwnerForm'

const OwnerCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (values: OwnerFormValues) => {
    if (!values.name || !values.phone) {
      alert('氏名と電話番号は必須です')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/owners', values)
      navigate(`/owners/${response.data.id}`)
    } catch (error) {
      console.error('Error creating owner:', error)
      alert('登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/owners')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <iconify-icon icon="solar:close-circle-linear" width="24" height="24"></iconify-icon>
          </button>
          <h1 className="text-lg font-bold font-heading">新規飼い主登録</h1>
        </div>
      </header>

      <OwnerForm onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}

export default OwnerCreate
