import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import { INPUT_CLASS } from '../utils/styles'
import { getBusinessTypeColors, getBusinessTypeLabel } from '../utils/businessTypeColors'
import type { RecordType } from '../types/record'

export interface OwnerFormValues {
  name: string
  name_kana: string
  phone: string
  email: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  notes: string
  business_types: string[]
}

interface OwnerFormProps {
  initialValues?: Partial<OwnerFormValues>
  onSubmit: (values: OwnerFormValues) => void
  loading?: boolean
  submitLabel?: string
  submitIcon?: string
  availableBusinessTypes?: RecordType[]
}

interface FormErrors {
  name?: string
  phone?: string
  email?: string
  business_types?: string
}

const ERROR_INPUT_CLASS = 'border-destructive focus:border-destructive focus:ring-destructive/20'

function OwnerForm({
  initialValues,
  onSubmit,
  loading = false,
  submitLabel = '登録する',
  submitIcon = 'solar:check-circle-bold',
  availableBusinessTypes,
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
    business_types: [],
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (initialValues) {
      setForm((prev) => ({
        ...prev,
        ...initialValues,
      }))
    }
  }, [initialValues])

  const businessTypes = availableBusinessTypes || (['daycare', 'grooming', 'hotel'] as RecordType[])

  useEffect(() => {
    if (businessTypes.length === 1 && form.business_types.length === 0) {
      setForm((prev) => ({
        ...prev,
        business_types: [businessTypes[0]],
      }))
    }
  }, [businessTypes, form.business_types.length])

  function validateField(name: string, value: string): string | undefined {
    switch (name) {
      case 'name':
        if (!value.trim()) return '氏名は必須です'
        break
      case 'phone':
        if (!value.trim()) return '電話番号は必須です'
        if (!/^\d{10,11}$/.test(value)) return '電話番号は10〜11桁の数字で入力してください'
        break
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'メールアドレスの形式が正しくありません'
        break
    }
    return undefined
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const { name, value } = e.target
    let processedValue = value
    if (name === 'phone' || name === 'emergency_contact_phone') {
      processedValue = value.replace(/-/g, '')
    }
    setForm((prev) => ({ ...prev, [name]: processedValue }))

    // リアルタイムバリデーション（一度タッチされたフィールドのみ）
    if (touched[name]) {
      const error = validateField(name, processedValue)
      setErrors((prev) => ({ ...prev, [name]: error }))
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors((prev) => ({ ...prev, [name]: error }))
  }

  function toggleBusinessType(type: string): void {
    const nextBusinessTypes = form.business_types.includes(type)
      ? form.business_types.filter((t) => t !== type)
      : [...form.business_types, type]

    setForm((prev) => ({
      ...prev,
      business_types: nextBusinessTypes,
    }))

    if (nextBusinessTypes.length > 0) {
      setErrors((prev) => ({ ...prev, business_types: undefined }))
    }
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault()

    // 送信時に全フィールドをバリデーション
    const newErrors: FormErrors = {}
    newErrors.name = validateField('name', form.name)
    newErrors.phone = validateField('phone', form.phone)
    newErrors.email = validateField('email', form.email)
    newErrors.business_types = form.business_types.length > 0 ? undefined : '利用サービスを1つ以上選択してください'

    const hasErrors = Object.values(newErrors).some((err) => err)
    if (hasErrors) {
      setErrors(newErrors)
      setTouched({ name: true, phone: true, email: true, business_types: true })
      return
    }

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
              onBlur={handleBlur}
              placeholder="田中 花子"
              className={`${INPUT_CLASS} ${errors.name ? ERROR_INPUT_CLASS : ''}`}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'owner-name-error' : undefined}
              required
            />
            {errors.name && (
              <p id="owner-name-error" className="text-xs text-destructive mt-1 flex items-center gap-1">
                <Icon icon="solar:danger-circle-bold" width="12" height="12" />
                {errors.name}
              </p>
            )}
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
              onBlur={handleBlur}
              placeholder="09012345678"
              inputMode="numeric"
              className={`${INPUT_CLASS} ${errors.phone ? ERROR_INPUT_CLASS : ''}`}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'owner-phone-error' : 'owner-phone-hint'}
              required
            />
            {errors.phone ? (
              <p id="owner-phone-error" className="text-xs text-destructive mt-1 flex items-center gap-1">
                <Icon icon="solar:danger-circle-bold" width="12" height="12" />
                {errors.phone}
              </p>
            ) : (
              <p id="owner-phone-hint" className="text-xs text-muted-foreground mt-1">ハイフンなしで入力してください</p>
            )}
          </div>

          <div>
            <label htmlFor="owner-email" className="block text-xs text-muted-foreground mb-1">メールアドレス</label>
            <input
              id="owner-email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="example@email.com"
              className={`${INPUT_CLASS} ${errors.email ? ERROR_INPUT_CLASS : ''}`}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'owner-email-error' : undefined}
            />
            {errors.email && (
              <p id="owner-email-error" className="text-xs text-destructive mt-1 flex items-center gap-1">
                <Icon icon="solar:danger-circle-bold" width="12" height="12" />
                {errors.email}
              </p>
            )}
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

      {/* 利用サービス */}
      {businessTypes.length > 0 && (
        <section className="bg-card rounded-2xl p-5 border border-border shadow-sm">
          <h3 className="text-sm font-bold font-heading flex items-center gap-2 mb-4">
            <Icon icon="solar:buildings-2-bold" className="text-primary size-4" />
            利用サービス <span className="text-destructive">*</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {businessTypes.map((type) => {
              const colors = getBusinessTypeColors(type)
              const label = getBusinessTypeLabel(type)
              const checked = form.business_types.includes(type)
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleBusinessType(type)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]"
                  style={{
                    background: checked ? colors.pale : '#FFFFFF',
                    border: checked ? `1.5px solid ${colors.primary}` : '1px solid #E2E8F0',
                    color: checked ? colors.primary : '#94A3B8',
                  }}
                  aria-pressed={checked}
                >
                  <Icon
                    icon={checked ? 'solar:check-circle-bold' : 'solar:circle-linear'}
                    width="18"
                    height="18"
                  />
                  {label}
                </button>
              )
            })}
          </div>
          {errors.business_types && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <Icon icon="solar:danger-circle-bold" width="12" height="12" />
              {errors.business_types}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-2">1つ以上選択してください（複数選択可）</p>
        </section>
      )}

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
