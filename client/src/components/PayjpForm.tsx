import { useState, useEffect, useRef } from 'react';

interface PayjpFormProps {
  publicKey: string;
  onTokenCreated: (token: string) => void;
  onError: (error: Error) => void;
  onSubmit?: () => void;
}

declare global {
  interface Window {
    Payjp: any;
  }
}

export default function PayjpForm({ publicKey, onTokenCreated, onError, onSubmit }: PayjpFormProps) {
  const [loading, setLoading] = useState(false);
  const [payjpLoaded, setPayjpLoaded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const cardExpiryRef = useRef<HTMLDivElement>(null);
  const cardCvcRef = useRef<HTMLDivElement>(null);
  const cardNameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // PAY.JPのJavaScript SDKを読み込む
    if (!window.Payjp) {
      const script = document.createElement('script');
      script.src = 'https://js.pay.jp/v1';
      script.async = true;
      script.onload = () => {
        if (window.Payjp) {
          setPayjpLoaded(true);
        } else {
          onError(new Error('PAY.JP SDKの初期化に失敗しました'));
        }
      };
      script.onerror = () => {
        onError(new Error('PAY.JP SDKの読み込みに失敗しました'));
      };
      document.head.appendChild(script);
    } else {
      setPayjpLoaded(true);
    }
  }, [onError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payjpLoaded || !window.Payjp) {
      onError(new Error('PAY.JP SDKが読み込まれていません'));
      return;
    }

    setLoading(true);
    onSubmit?.();

    try {
      const payjp = window.Payjp(publicKey);
      
      // カード情報を取得
      const cardNumber = (document.getElementById('card-number') as HTMLInputElement)?.value.replace(/\s/g, '');
      const cardCvc = (document.getElementById('card-cvc') as HTMLInputElement)?.value;
      const cardExpMonth = (document.getElementById('card-exp-month') as HTMLInputElement)?.value;
      const cardExpYear = (document.getElementById('card-exp-year') as HTMLInputElement)?.value;
      const cardName = (document.getElementById('card-name') as HTMLInputElement)?.value || '';

      if (!cardNumber || !cardCvc || !cardExpMonth || !cardExpYear) {
        throw new Error('すべての必須項目を入力してください');
      }

      // カード情報からトークンを作成
      const result = await payjp.createToken({
        number: cardNumber,
        cvc: cardCvc,
        exp_month: cardExpMonth,
        exp_year: `20${cardExpYear}`, // 2桁の年を4桁に変換
        name: cardName,
      });

      if (result.error) {
        throw new Error(result.error.message || 'カード情報の処理に失敗しました');
      }

      onTokenCreated(result.id);
    } catch (error: any) {
      onError(error instanceof Error ? error : new Error(error.message || 'トークン作成に失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          カード番号 <span className="text-destructive">*</span>
        </label>
        <input
          id="card-number"
          type="text"
          placeholder="4242 4242 4242 4242"
          maxLength={19}
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            有効期限（月） <span className="text-destructive">*</span>
          </label>
          <input
            id="card-exp-month"
            type="text"
            placeholder="12"
            maxLength={2}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            有効期限（年） <span className="text-destructive">*</span>
          </label>
          <input
            id="card-exp-year"
            type="text"
            placeholder="25"
            maxLength={2}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">
            CVC <span className="text-destructive">*</span>
          </label>
          <input
            id="card-cvc"
            type="text"
            placeholder="123"
            maxLength={4}
            className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-muted-foreground mb-1">
          カード名義人
        </label>
        <input
          id="card-name"
          type="text"
          placeholder="TARO YAMADA"
          className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !payjpLoaded}
        className="w-full bg-primary text-primary-foreground py-3.5 rounded-xl text-sm font-bold hover:bg-primary/90 active:bg-primary/80 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? (
          <>
            <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="animate-spin"></iconify-icon>
            処理中...
          </>
        ) : (
          <>
            <iconify-icon icon="solar:check-circle-bold" width="20" height="20"></iconify-icon>
            カード情報を登録
          </>
        )}
      </button>
    </form>
  );
}
