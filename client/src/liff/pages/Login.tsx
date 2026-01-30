import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon'
import { useNavigate, useLocation } from 'react-router-dom';
import { getLiffProfile, initLiff, isLiffLoggedIn } from '../utils/liff';
import { useLiffAuthStore } from '../store/authStore';
import liffClient from '../api/client';
import logoImage from '../../assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth, isAuthenticated } = useLiffAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PrivateRouteから渡された元のURL、sessionStorage、デフォルト /home の順で決定
  const stateFrom = (location.state as { from?: string })?.from;
  const redirectTo = stateFrom || sessionStorage.getItem('liff_redirect') || '/home';

  // リダイレクト先をsessionStorageに保存（LIFFリダイレクトで state が消える場合の保険）
  useEffect(() => {
    if (stateFrom) {
      sessionStorage.setItem('liff_redirect', stateFrom);
    }
  }, [stateFrom]);

  useEffect(() => {

    if (isAuthenticated) {
      sessionStorage.removeItem('liff_redirect');
      navigate(redirectTo, { replace: true });
      return;
    }

    const handleLogin = async () => {
      try {
        setLoading(true);
        
        // 開発環境（LIFF_IDが設定されていない場合）はダミーデータで認証
        if (!import.meta.env.VITE_LIFF_ID) {
          const mockProfile = {
            userId: 'dev-user-12345',  // データベースに設定した固定ID
            displayName: '開発ユーザー',
            pictureUrl: undefined,
          };
          
          try {
            const response = await liffClient.post('/auth', {
              lineUserId: mockProfile.userId,
              displayName: mockProfile.displayName,
              pictureUrl: mockProfile.pictureUrl,
            });

            if (response.data.token && response.data.owner) {
              setAuth(response.data.token, response.data.owner);
              sessionStorage.removeItem('liff_redirect');
              navigate(redirectTo, { replace: true });
              return;
            }
          } catch (authError: any) {
            if (authError.response?.data?.requiresRegistration) {
              setError('開発用LINE ID (dev-user-12345) がデータベースに登録されていません。\nターミナルで以下を実行:\npsql -d pet_carte -c "UPDATE owners SET line_id = \'dev-user-12345\' WHERE id = 1;"');
            } else {
              setError('開発環境での認証に失敗しました: ' + (authError.response?.data?.error || authError.message));
            }
            setLoading(false);
            return;
          }
        }

        // 本番環境: LIFF SDKを使用
        await initLiff();
        
        // LIFFログイン状態を確認
        const loggedIn = isLiffLoggedIn();
        
        if (!loggedIn) {
          // getLiffProfile内でliff.login()が呼ばれ、リダイレクトが発生する
          // リダイレクト後、再度このページがロードされる
          await getLiffProfile();
          return; // ここには到達しない（リダイレクト後）
        }

        // ログイン済みの場合、プロフィールを取得
        const profile = await getLiffProfile();

        // バックエンドでLINE認証
        const response = await liffClient.post('/auth', {
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });

        if (response.data.token && response.data.owner) {
          setAuth(response.data.token, response.data.owner);
          sessionStorage.removeItem('liff_redirect');
          navigate(redirectTo, { replace: true });
        } else {
          setError('認証に失敗しました');
        }
      } catch (err: any) {
        
        // リダイレクト中のエラーは無視
        if (err.message === 'Redirecting to LINE login...') {
          return;
        }
        
        if (err.response?.data?.requiresRegistration) {
          // LINE User IDを取得して紐付け画面へ遷移
          try {
            if (!isLiffLoggedIn()) {
              setError('LINEログインが必要です');
              return;
            }
            const profile = await getLiffProfile();
            navigate('/link', { 
              state: { lineUserId: profile.userId },
              replace: true 
            });
            return;
          } catch {
            setError('LINEアカウント情報の取得に失敗しました');
          }
        } else {
          setError('ログインに失敗しました: ' + (err.message || '不明なエラー'));
        }
      } finally {
        setLoading(false);
      }
    };

    handleLogin();
  }, [navigate, setAuth, isAuthenticated, redirectTo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center px-8">
          {/* ロゴ */}
          <img src={logoImage} alt="Blink" className="h-24 mx-auto mb-6 animate-pulse" />
          <p className="text-sm text-muted-foreground mb-8">犬の幼稚園・保育園</p>
          
          <Icon icon="solar:spinner-bold"
            width="40"
            height="40"
            className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">ログイン中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-primary/5 to-background px-5">
        <div className="text-center max-w-sm">
          {/* ロゴ */}
          <img src={logoImage} alt="Blink" className="h-20 mx-auto mb-6" />
          
          <div className="bg-destructive/10 rounded-2xl p-6 mb-6">
            <Icon icon="solar:danger-triangle-bold"
              width="48"
              height="48"
              className="text-destructive mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">ログインエラー</h1>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{error}</p>
          </div>
          
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold w-full
                       active:scale-95 transition-transform min-h-[56px] shadow-lg"
            aria-label="再試行"
          >
            再試行
          </button>
          
          <p className="text-xs text-muted-foreground mt-4">
            問題が解決しない場合は店舗にお問い合わせください
          </p>
        </div>
      </div>
    );
  }

  return null;
}
