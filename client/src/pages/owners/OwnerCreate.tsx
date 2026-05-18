import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'
import { useToast } from '../../components/Toast'
import OwnerForm, { OwnerFormValues } from '../../components/OwnerForm'
import { useAuthStore } from '../../store/authStore'
import { useTrialStepCompletion } from '../../hooks/useTrialStepCompletion'
import { TrialPageGuide } from '../../components/trial/TrialPageGuide'
import type { RecordType } from '../../types/record'

interface DogDraft {
  name: string
  breed: string
  birth_date: string
  gender: 'オス' | 'メス'
}

const EMPTY_DOG: DogDraft = { name: '', breed: '', birth_date: '', gender: 'オス' }

const OwnerCreate = () => {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const businessTypes = useAuthStore((s) => s.user?.businessTypes) as RecordType[] | undefined

  // トライアルガイド: 飼い主登録完了で Step 2 自動完了
  useTrialStepCompletion('register_customer', saved)

  const [includeDog, setIncludeDog] = useState(false)
  const [dogs, setDogs] = useState<DogDraft[]>([{ ...EMPTY_DOG }])

  const updateDog = (index: number, field: keyof DogDraft, value: string) => {
    setDogs((prev) => prev.map((dog, i) => (i === index ? { ...dog, [field]: value } : dog)))
  }
  const addDog = () => {
    setDogs((prev) => [...prev, { ...EMPTY_DOG }])
  }
  const removeDog = (index: number) => {
    setDogs((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  const handleSubmit = async (values: OwnerFormValues) => {
    if (!values.name || !values.phone) {
      showToast('氏名と電話番号は必須です', 'warning')
      return
    }

    const dogsToSubmit = includeDog
      ? dogs.filter((d) => d.name || d.breed || d.birth_date)
      : []

    if (includeDog && dogsToSubmit.length === 0) {
      showToast('ワンちゃん情報を1頭以上入力してください', 'warning')
      return
    }

    for (const dog of dogsToSubmit) {
      if (!dog.name || !dog.breed || !dog.birth_date) {
        showToast('ワンちゃんの名前・犬種・生年月日は必須です', 'warning')
        return
      }
    }

    setLoading(true)
    try {
      const response = await api.post('/owners', {
        name: values.name,
        name_kana: values.name_kana || null,
        phone: values.phone,
        email: values.email || null,
        postal_code: values.postal_code || null,
        address: values.address || null,
        birth_date: values.birth_date || null,
        is_member: values.is_member,
        member_number: values.member_number || null,
        emergency_contact: values.emergency_contact_name || null,
        emergency_picker: values.emergency_contact_phone || null,
        memo: values.notes || null,
        business_types: values.business_types,
        dogs: dogsToSubmit.length > 0 ? dogsToSubmit : undefined,
      })
      const ownerId = response.data.id

      setSaved(true)
      navigate(`/owners/${ownerId}`)
    } catch {
      showToast('登録に失敗しました', 'error')
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

      <div className="px-5 pt-4">
        <TrialPageGuide
          stepKey="register_customer"
          title="飼い主さんの情報を入力しましょう"
          detail="お名前と電話番号を入力して、ワンちゃんのお名前も登録しましょう。お試しですので、ご自身の情報で大丈夫ですよ。"
        />
      </div>

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
            <div className="space-y-5 pt-2">
              {dogs.map((dog, index) => (
                <div key={index} className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground">ワンちゃん {index + 1}</h4>
                    {dogs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDog(index)}
                        className="text-xs text-destructive font-bold inline-flex items-center gap-1 active:scale-95 transition-transform min-h-[32px] px-2"
                        aria-label={`ワンちゃん ${index + 1} を削除`}
                      >
                        <Icon icon="solar:trash-bin-minimalistic-linear" width="14" height="14" />
                        削除
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      名前 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={dog.name}
                      onChange={(e) => updateDog(index, 'name', e.target.value)}
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
                      value={dog.breed}
                      onChange={(e) => updateDog(index, 'breed', e.target.value)}
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
                        value={dog.gender}
                        onChange={(e) => updateDog(index, 'gender', e.target.value)}
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
                        value={dog.birth_date}
                        onChange={(e) => updateDog(index, 'birth_date', e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addDog}
                className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-primary/5 min-h-[48px]"
              >
                <Icon icon="solar:add-circle-bold" width="20" height="20" />
                ワンちゃんを追加
              </button>

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
