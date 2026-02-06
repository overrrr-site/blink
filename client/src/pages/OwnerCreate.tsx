import { useState } from 'react'
import { Icon } from '../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import OwnerForm, { OwnerFormValues } from '../components/OwnerForm'
import { useAuthStore } from '../store/authStore'
import type { RecordType } from '../types/record'

const OwnerCreate = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const businessTypes = useAuthStore((s) => s.user?.businessTypes) as RecordType[] | undefined
  const [dogInfo, setDogInfo] = useState({
    name: '',
    breed: '',
    birth_date: '',
    gender: 'オス',
  })
  const [includeDog, setIncludeDog] = useState(false)

  const handleDogChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setDogInfo((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (values: OwnerFormValues) => {
    if (!values.name || !values.phone) {
      alert('氏名と電話番号は必須です')
      return
    }

    if (includeDog && (!dogInfo.name || !dogInfo.breed || !dogInfo.birth_date)) {
      alert('ワンちゃんを登録する場合は、名前、犬種、生年月日は必須です')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/owners', values)
      const ownerId = response.data.id

      // 犬情報も登録する場合
      if (includeDog && dogInfo.name && dogInfo.breed && dogInfo.birth_date) {
        try {
          await api.post('/dogs', {
            owner_id: ownerId,
            name: dogInfo.name,
            breed: dogInfo.breed,
            birth_date: dogInfo.birth_date,
            gender: dogInfo.gender,
          })
        } catch {
          alert('飼い主は登録されましたが、ワンちゃんの登録に失敗しました。飼い主詳細ページから再度登録してください。')
        }
      }

      navigate(`/owners/${ownerId}`)
    } catch {
      alert('登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pb-6">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between safe-area-pt">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/customers')}
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          >
            <Icon icon="solar:close-circle-linear" width="24" height="24" />
          </button>
          <h1 className="text-lg font-bold font-heading">新規飼い主登録</h1>
        </div>
      </header>

      <OwnerForm onSubmit={handleSubmit} loading={loading} availableBusinessTypes={businessTypes} />

      {/* 犬情報入力セクション */}
      <div className="px-5 pt-4">
        <div className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="includeDog"
              checked={includeDog}
              onChange={(e) => setIncludeDog(e.target.checked)}
              className="size-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/20"
            />
            <label htmlFor="includeDog" className="text-sm font-bold font-heading flex items-center gap-2 cursor-pointer">
              <Icon icon="solar:paw-print-bold" className="text-primary size-4" />
              同時にワンちゃんも登録する
            </label>
          </div>

          {includeDog && (
            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  名前 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={dogInfo.name}
                  onChange={handleDogChange}
                  placeholder="もも"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">
                  犬種 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  name="breed"
                  value={dogInfo.breed}
                  onChange={handleDogChange}
                  placeholder="トイプードル"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    性別 <span className="text-destructive">*</span>
                  </label>
                  <select
                    name="gender"
                    value={dogInfo.gender}
                    onChange={handleDogChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    <option value="オス">オス</option>
                    <option value="メス">メス</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    生年月日 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    name="birth_date"
                    value={dogInfo.birth_date}
                    onChange={handleDogChange}
                    className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                詳細な健康情報は、登録後にワンちゃんの編集画面から追加できます
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OwnerCreate
