import { useState, useEffect } from 'react'
import { Icon } from './Icon'
import { INPUT_CLASS } from '../utils/styles'

interface PayjpFormProps {
  publicKey: string
  onTokenCreated: (token: string) => void
  onError: (error: Error) => void
  onSubmit?: () => void
}

interface PayjpTokenResult {
  id: string
  error?: { message?: string }
}

interface PayjpInstance {
  createToken: (card: {
    number: string
    cvc: string
    exp_month: string
    exp_year: string
    name: string
  }) => Promise<PayjpTokenResult>
}

declare global {
  interface Window {
    Payjp: ((publicKey: string) => PayjpInstance) | undefined
  }
}

export default function PayjpForm({ publicKey, onTokenCreated, onError, onSubmit }: PayjpFormProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [payjpLoaded, setPayjpLoaded] = useState(false)

  useEffect(() => {
    if (!window.Payjp) {
      const script = document.createElement('script')
      script.src = 'https://js.pay.jp/v1'
      script.async = true
      script.onload = () => {
        if (window.Payjp) {
          setPayjpLoaded(true)
        } else {
          onError(new Error('PAY.JP SDKの初期化に失敗しました'))
        }
      }
      script.onerror = () => {
        onError(new Error('PAY.JP SDKの読み込みに失敗しました'))
      }
      document.head.appendChild(script)
    } else {
      setPayjpLoaded(true)
    }
  }, [onError])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!payjpLoaded || !window.Payjp) {
      onError(new Error('PAY.JP SDKが読み込まれていません'))
      return
    }

    setLoading(true)
    onSubmit?.()

    try {
      const payjp = window.Payjp(publicKey)

      const cardNumber = (document.getElementById('card-number') as HTMLInputElement)?.value.replace(/\s/g, '')
      const cardCvc = (document.getElementById('card-cvc') as HTMLInputElement)?.value
      const cardExpMonth = (document.getElementById('card-exp-month') as HTMLInputElement)?.value
      const cardExpYear = (document.getElementById('card-exp-year') as HTMLInputElement)?.value
      const cardName = (document.getElementById('card-name') as HTMLInputElement)?.value || ''

      if (!cardNumber || !cardCvc || !cardExpMonth || !cardExpYear) {
        throw new Error('すべての必須項目を入力してください')
      }

      const result = await payjp.createToken({
        number: cardNumber,
        cvc: cardCvc,
        exp_month: cardExpMonth,
        exp_year: `20${cardExpYear}`,
        name: cardName,
      })

      if (result.error) {
        throw new Error(result.error.message || 'カード情報の処理に失敗しました')
      }

      onTokenCreated(result.id)
    } catch (error) {
      onError(error instanceof Error ? error : new Error('トークン作成に失敗しました'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="card-number" className="block text-xs text-muted-foreground mb-1">
          カード番号 <span className="text-destructive">*</span>
        </label>
        <input
          id="card-number"
          type="text"
          inputMode="numeric"
          placeholder="4242 4242 4242 4242"
          maxLength={19}
          autoComplete="cc-number"
          className={INPUT_CLASS}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="card-exp-month" className="block text-xs text-muted-foreground mb-1">
            有効期限（月） <span className="text-destructive">*</span>
          </label>
          <input
            id="card-exp-month"
            type="text"
            inputMode="numeric"
            placeholder="12"
            maxLength={2}
            autoComplete="cc-exp-month"
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label htmlFor="card-exp-year" className="block text-xs text-muted-foreground mb-1">
            有効期限（年） <span className="text-destructive">*</span>
          </label>
          <input
            id="card-exp-year"
            type="text"
            inputMode="numeric"
            placeholder="25"
            maxLength={2}
            autoComplete="cc-exp-year"
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label htmlFor="card-cvc" className="block text-xs text-muted-foreground mb-1">
            CVC <span className="text-destructive">*</span>
          </label>
          <input
            id="card-cvc"
            type="text"
            inputMode="numeric"
            placeholder="123"
            maxLength={4}
            autoComplete="cc-csc"
            className={INPUT_CLASS}
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="card-name" className="block text-xs text-muted-foreground mb-1">
          カード名義人
        </label>
        <input
          id="card-name"
          type="text"
          placeholder="TARO YAMADA"
          autoComplete="cc-name"
          className={INPUT_CLASS}
        />
      </div>

      <button
        type="submit"
        disabled={loading || !payjpLoaded}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <Icon icon="solar:spinner-bold" width="20" height="20" className="animate-spin" />
            処理中...
          </>
        ) : (
          <>
            <Icon icon="solar:check-circle-bold" width="20" height="20" />
            カード情報を登録
          </>
        )}
      </button>
    </form>
  )
}
