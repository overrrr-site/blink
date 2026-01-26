import { useState, useEffect } from 'react'

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

const OwnerForm = ({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = '登録する',
  submitIcon = 'solar:check-circle-bold'
}: OwnerFormProps) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    // 電話番号入力時にハイフンを自動除去
    if (name === 'phone' || name === 'emergency_contact_phone') {
      setForm((prev) => ({ ...prev, [name]: value.replace(/-/g, '') }))
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="px-5 pt-4 space-y-4">
      {/* 基本情報 */}
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <iconify-icon icon="solar:user-bold" class="text-primary size-4"></iconify-icon>
          基本情報
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              氏名 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="田中 花子"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">フリガナ</label>
            <input
              type="text"
              name="name_kana"
              value={form.name_kana}
              onChange={handleChange}
              placeholder="タナカ ハナコ"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              電話番号 <span className="text-destructive">*</span>
            </label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="09012345678"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">ハイフンなしで入力してください</p>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">メールアドレス</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">住所</label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="東京都渋谷区..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>
      </section>

      {/* 緊急連絡先 */}
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <iconify-icon icon="solar:danger-triangle-bold" class="text-destructive size-4"></iconify-icon>
          緊急連絡先
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">氏名（続柄）</label>
            <input
              type="text"
              name="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={handleChange}
              placeholder="田中 太郎（夫）"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">電話番号</label>
            <input
              type="tel"
              name="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={handleChange}
              placeholder="08098765432"
              className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground mt-1">ハイフンなしで入力してください</p>
          </div>
        </div>
      </section>

      {/* メモ */}
      <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
        <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
          <iconify-icon icon="solar:notes-bold" class="text-muted-foreground size-4"></iconify-icon>
          メモ
        </h3>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="特記事項があれば入力"
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </section>

      {/* 保存ボタン */}
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
              {submitIcon && <iconify-icon icon={submitIcon} width="20" height="20"></iconify-icon>}
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

export default OwnerForm
