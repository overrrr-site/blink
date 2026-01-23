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
        // URLからセッション情報を取得
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (!session) {
          throw new Error('セッションが見つかりません')
        }

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
