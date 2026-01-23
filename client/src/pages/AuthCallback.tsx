import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

const AuthCallback = () => {
  const navigate = useNavigate()
  const { fetchStaffInfo } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('=== AuthCallback 開始 ===')
        console.log('現在のURL:', window.location.href)
        console.log('URLハッシュ:', window.location.hash ? '存在する' : '存在しない')
        
        // OAuthコールバックからセッションを取得
        // URLハッシュフラグメント（#access_token=...）を処理
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('getSession結果:', { 
          hasSession: !!session, 
          hasError: !!sessionError,
          errorMessage: sessionError?.message
        })

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          // セッションがまだ取得できない場合、URLハッシュを処理
          const hashParams = new URLSearchParams(window.location.hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')
          
          console.log('URLハッシュからトークン取得:', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            accessTokenLength: accessToken?.length
          })

          if (accessToken && refreshToken) {
            // セッションを設定
            console.log('setSession実行中...')
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            console.log('setSession結果:', {
              hasSession: !!data.session,
              hasError: !!error,
              errorMessage: error?.message
            })

            if (error) {
              throw error
            }

            if (data.session) {
              console.log('セッション設定成功、スタッフ情報取得中...')
              console.log('Access Token (最初の50文字):', data.session.access_token.substring(0, 50) + '...')
              // スタッフ情報を取得
              await fetchStaffInfo(data.session.access_token)
              // ダッシュボードにリダイレクト
              navigate('/', { replace: true })
              return
            }
          }

          throw new Error('セッションが見つかりません。URLハッシュを確認してください。')
        }

        console.log('既存セッション使用、スタッフ情報取得中...')
        console.log('Access Token (最初の50文字):', session.access_token.substring(0, 50) + '...')
        // スタッフ情報を取得
        await fetchStaffInfo(session.access_token)

        // ダッシュボードにリダイレクト
        navigate('/', { replace: true })
      } catch (err: any) {
        console.error('認証コールバックエラー:', err)
        setError(err.message || '認証に失敗しました')
        // 3秒後にログインページにリダイレクト
        setTimeout(() => {
          navigate('/login', { replace: true })
        }, 3000)
      }
    }

    handleCallback()
  }, [navigate, fetchStaffInfo])

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm max-w-md mx-auto text-center">
          <div className="text-destructive mb-4">
            <iconify-icon icon="solar:danger-triangle-bold" width="48" height="48"></iconify-icon>
          </div>
          <h2 className="text-lg font-bold mb-2">認証エラー</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">ログインページに戻ります...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="bg-card rounded-3xl p-8 border border-border shadow-sm max-w-md mx-auto text-center">
        <div className="animate-spin text-primary mb-4 inline-block">
          <iconify-icon icon="solar:spinner-line-duotone" width="48" height="48"></iconify-icon>
        </div>
        <h2 className="text-lg font-bold mb-2">認証中...</h2>
        <p className="text-sm text-muted-foreground">しばらくお待ちください</p>
      </div>
    </div>
  )
}

export default AuthCallback
