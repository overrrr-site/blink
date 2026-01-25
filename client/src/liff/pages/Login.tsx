import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLiffProfile, initLiff } from '../utils/liff';
import { useLiffAuthStore } from '../store/authStore';
import liffClient from '../api/client';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useLiffAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    const handleLogin = async () => {
      try {
        setLoading(true);
        
        // 開発環境（LIFF_IDが設定されていない場合）はダミーデータで認証
        if (!import.meta.env.VITE_LIFF_ID) {
          console.log('開発モード: ダミーLINE IDで認証します');
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
              navigate('/');
              return;
            }
          } catch (authError: any) {
            console.error('Dev auth error:', authError);
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
        const profile = await getLiffProfile();

        // バックエンドでLINE認証
        const response = await liffClient.post('/auth', {
          lineUserId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
        });

        if (response.data.token && response.data.owner) {
          setAuth(response.data.token, response.data.owner);
          navigate('/');
        } else {
          setError('認証に失敗しました');
        }
      } catch (err: any) {
        console.error('Login error:', err);
        if (err.response?.data?.requiresRegistration) {
          // LINE User IDを取得して紐付け画面へ遷移
          try {
            const profile = await getLiffProfile();
            navigate('/link', { 
              state: { lineUserId: profile.userId },
              replace: true 
            });
            return;
          } catch (profileError) {
            console.error('Failed to get LINE profile:', profileError);
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
  }, [navigate, setAuth, isAuthenticated]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-b from-primary/5 to-background">
        <div className="text-center px-8">
          {/* ロゴ */}
          <div className="size-24 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <iconify-icon icon="solar:paw-print-bold" width="48" height="48" class="text-white"></iconify-icon>
          </div>
          <h1 className="text-2xl font-bold font-heading text-primary mb-2">BLINK</h1>
          <p className="text-sm text-muted-foreground mb-8">犬の幼稚園</p>
          
          <iconify-icon
            icon="solar:spinner-bold"
            width="40"
            height="40"
            class="text-primary animate-spin mx-auto mb-4"
          ></iconify-icon>
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
          <div className="size-20 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <iconify-icon icon="solar:paw-print-bold" width="40" height="40" class="text-white"></iconify-icon>
          </div>
          
          <div className="bg-destructive/10 rounded-2xl p-6 mb-6">
            <iconify-icon
              icon="solar:danger-triangle-bold"
              width="48"
              height="48"
              class="text-destructive mx-auto mb-4"
            ></iconify-icon>
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
