import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

export function TrialExpiredOverlay() {
  const navigate = useNavigate()
  const [extending, setExtending] = useState(false)
  const [extended, setExtended] = useState(false)

  const handleExtend = async () => {
    setExtending(true)
    try {
      await axios.post('/api/trial/extend', { days: 14 })
      setExtended(true)
      setTimeout(() => window.location.reload(), 1500)
    } catch {
      // Extension failed silently
    } finally {
      setExtending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-foreground">
            トライアル期間が終了しました
          </h2>
          <p className="text-sm text-muted-foreground">
            引き続きBlinkをご利用いただくには、
            本契約への切り替えまたはトライアルの延長が必要です。
          </p>
        </div>

        {extended ? (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
            トライアルを14日間延長しました。画面を更新します...
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/settings/convert')}
              className="w-full px-4 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all min-h-[48px]"
            >
              本契約に切り替える
            </button>
            <button
              onClick={handleExtend}
              disabled={extending}
              className="w-full px-4 py-3 bg-card text-foreground border border-border text-sm font-medium rounded-xl hover:bg-muted active:scale-[0.98] transition-all min-h-[48px]"
            >
              {extending ? '延長中...' : 'トライアルを延長する（14日間）'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
