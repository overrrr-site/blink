import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon'
import { useNavigate, useLocation } from 'react-router-dom';
import { getLiffProfile, isLiffLoggedIn, initLiff } from '../utils/liff';
import { useLiffAuthStore } from '../store/authStore';
import liffClient from '../api/client';
import { getAxiosErrorMessage } from '../../utils/error';
import logoImage from '../../assets/logo.png';

type Step = 'phone' | 'code';

export default function LinkAccount() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useLiffAuthStore();
  const [step, setStep] = useState<Step>('phone');
  const [lineUserId, setLineUserId] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // URLパラメータまたはlocation stateからLINE User IDを取得
    const params = new URLSearchParams(location.search);
    const userId = params.get('lineUserId') || location.state?.lineUserId;
    
    if (userId) {
      setLineUserId(userId);
    } else {
      // LINE User IDが取得できない場合は、LIFFから取得を試みる
      const fetchLineUserId = async () => {
        try {
          // LIFF初期化
          await initLiff();
          
          // ログイン状態を確認
          if (!isLiffLoggedIn()) {
            // 未ログインの場合、getLiffProfileがliff.login()を呼び出しリダイレクト
            await getLiffProfile();
            return;
          }
          
          const profile = await getLiffProfile();
          setLineUserId(profile.userId);
        } catch (err) {
          // リダイレクト中のエラーは無視
          if (err instanceof Error && err.message === 'Redirecting to LINE login...') {
            return;
          }
          setError('LINEアカウント情報の取得に失敗しました');
        }
      };
      fetchLineUserId();
    }
  }, [location]);

  const handleRequestCode = async () => {
    if (!phone.trim()) {
      setError('電話番号を入力してください');
      return;
    }

    if (!lineUserId) {
      setError('LINEアカウント情報が取得できませんでした');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await liffClient.post('/link/request', {
        phone: phone.trim(),
        lineUserId,
      });

      setMaskedEmail(response.data.maskedEmail);
      setStep('code');
    } catch (err) {
      setError(getAxiosErrorMessage(err, '確認コードの送信に失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      setError('確認コードを入力してください');
      return;
    }

    if (!lineUserId || !phone) {
      setError('必要な情報が不足しています');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await liffClient.post('/link/verify', {
        phone: phone.trim(),
        code: code.trim(),
        lineUserId,
      });

      if (response.data.token && response.data.owner) {
        setAuth(response.data.token, response.data.owner);
        navigate('/home');
      } else {
        setError('認証に失敗しました');
      }
    } catch (err) {
      setError(getAxiosErrorMessage(err, '確認コードの検証に失敗しました'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary/5 to-background px-5 py-8">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <img src={logoImage} alt="Blink" className="h-20 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">LINEアカウントの紐付け</p>
        </div>

        {/* ステップ1: 電話番号入力 */}
        {step === 'phone' && (
          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2">電話番号を入力</h2>
              <p className="text-sm text-muted-foreground mb-4">
                登録済みの電話番号を入力してください。確認コードをメールアドレスに送信します。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">電話番号（ハイフンなし）</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="09012345678"
                maxLength={11}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <button
              onClick={handleRequestCode}
              disabled={loading || !phone.trim()}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-transform min-h-[56px] shadow-lg
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
                  送信中...
                </>
              ) : (
                <>
                  <Icon icon="solar:letter-bold" className="size-5" />
                  確認コードを送信
                </>
              )}
            </button>
          </div>
        )}

        {/* ステップ2: 確認コード入力 */}
        {step === 'code' && (
          <div className="bg-card rounded-2xl border border-border shadow-lg p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-2">確認コードを入力</h2>
              <p className="text-sm text-muted-foreground mb-2">
                {maskedEmail} に確認コードを送信しました。
              </p>
              <p className="text-xs text-muted-foreground">
                確認コードは10分間有効です。
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">確認コード（6桁）</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                disabled={loading}
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold
                           disabled:opacity-50 disabled:cursor-not-allowed
                           active:scale-95 transition-transform min-h-[56px] shadow-lg
                           flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
                    確認中...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:check-circle-bold" className="size-5" />
                    確認して紐付け
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError(null);
                }}
                disabled={loading}
                className="w-full text-sm text-muted-foreground py-3
                           disabled:opacity-50"
              >
                電話番号を変更
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-center text-muted-foreground mt-6">
          問題が解決しない場合は店舗にお問い合わせください
        </p>
      </div>
    </div>
  );
}
