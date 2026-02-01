import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import { INPUT_CLASS } from '../utils/styles'

export interface OwnerFormValues {
  name: string
  name_kana: string
  phone: string
  email: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
}

interface OwnerFormProps {
  initialValues?: Partial<OwnerFormValues>
  onSubmit: (values: OwnerFormValues) => void
  loading?: boolean
  submitLabel?: string
  submitIcon?: string
}

function OwnerForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = '登録する',
  submitIcon = 'solar:check-circle-bold',
}: OwnerFormProps): JSX.Element {
  const [form, setForm] = useState<OwnerFormValues>({
    name: '',
    name_kana: '',
    phone: '',
    email: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
  })

  useEffect(() => {
    if (initialValues) {
      setForm((prev) => ({
        ...prev,
        ...initialValues,
      }))
    }
  }, [initialValues])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const { name, value } = e.target
    if (name === 'phone' || name === 'emergency_contact_phone') {
      setForm((prev) => ({ ...prev, [name]: value.replace(/-/g, '') }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <Icon icon="solar:user-bold" className="text-primary size-4" />
          基本情報
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="owner-name" className="block text-xs text-muted-foreground mb-1">
              氏名 <span className="text-destructive">*</span>
            </label>
            <input
              id="owner-name"
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="田中 花子"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="owner-name-kana" className="block text-xs text-muted-foreground mb-1">フリガナ</label>
            <input
              id="owner-name-kana"
              type="text"
              name="name_kana"
              value={form.name_kana}
              onChange={handleChange}
              placeholder="タナカ ハナコ"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="owner-phone" className="block text-xs text-muted-foreground mb-1">
              電話番号 <span className="text-destructive">*</span>
            </label>
            <input
              id="owner-phone"
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="09012345678"
              className={INPUT_CLASS}
            />
            <p className="text-xs text-muted-foreground mt-1">ハイフンなしで入力してください</p>
          </div>

          <div>
            <label htmlFor="owner-email" className="block text-xs text-muted-foreground mb-1">メールアドレス</label>
            <input
              id="owner-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="owner-address" className="block text-xs text-muted-foreground mb-1">住所</label>
            <input
              id="owner-address"
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="東京都渋谷区..."
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <Icon icon="solar:danger-triangle-bold" className="text-destructive size-4" />
          緊急連絡先
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="emergency-name" className="block text-xs text-muted-foreground mb-1">氏名（続柄）</label>
            <input
              id="emergency-name"
              type="text"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleChange}
              placeholder="田中 太郎（夫）"
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label htmlFor="emergency-phone" className="block text-xs text-muted-foreground mb-1">電話番号</label>
            <input
              id="emergency-phone"
              type="tel"
              name="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={handleChange}
              placeholder="08098765432"
              className={INPUT_CLASS}
            />
            <p className="text-xs text-muted-foreground mt-1">ハイフンなしで入力してください</p>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <Icon icon="solar:notes-bold" className="text-muted-foreground size-4" />
          メモ
        </h3>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="特記事項があれば入力"
          rows={3}
          className={`${INPUT_CLASS} resize-none`}
        />
      </section>

      <div className="pt-4 pb-8">
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            '処理中...'
          ) : (
            <>
              {submitIcon && <Icon icon={submitIcon} width="20" height="20" />}
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default OwnerForm
