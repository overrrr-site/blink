import { useState } from 'react'
import { Icon } from '../Icon'
import { useTrialStore } from '../../store/trialStore'
import { CharacterBubble } from './GuideCharacter'

const HELP_CONTENT: Record<string, { question: string; answer: string }[]> = {
  register_customer: [
    { question: '何を入力すればいいですか？', answer: 'お試しですので、ご自身のお名前と電話番号を入力してください。ワンちゃんのお名前もお好きなもので大丈夫です。' },
    { question: '間違えて入力しても大丈夫？', answer: 'はい、あとから修正できます。お試し中はお気軽にお使いください。' },
  ],
  create_reservation: [
    { question: 'どの犬を選べばいいですか？', answer: '先ほど登録したワンちゃんを選んでください。日付は今日でも明日でもお好きな日で大丈夫です。' },
    { question: '予約を間違えたら？', answer: 'あとから変更や削除ができますので、お気軽にお試しください。' },
  ],
  write_record: [
    { question: '何を書けばいいですか？', answer: '実際の運用ではワンちゃんの今日の様子を書きます。お試しなので「元気に遊びました」など、自由にお書きください。' },
    { question: '連絡帳は誰に届きますか？', answer: '飼い主さんのLINEに届きます。今回はご自身のLINEに届くので、届き方を確認できます。' },
  ],
  link_line_account: [
    { question: 'QRコードが読み取れません', answer: 'LINEアプリの「友だち追加」からQRコードリーダーを開いて、画面のQRコードを読み取ってください。' },
    { question: '店舗コードはどこに送りますか？', answer: 'QRコードで友だち追加した公式アカウントのトーク画面に、表示されている店舗コードをそのまま送信してください。' },
  ],
  write_internal_notes: [
    { question: '内部記録とは何ですか？', answer: 'スタッフだけが見られるメモです。気になったことや申し送り事項を書き留めておけます。飼い主さんには見えません。' },
    { question: 'どこから書けますか？', answer: 'ダッシュボードの予約カードをタップし、「内部記録」の欄に入力してください。' },
  ],
  send_line_notification: [
    { question: '通知が届きません', answer: 'LINEの友だち追加が完了しているか確認してください。また、通知が届くまで少し時間がかかることがあります。' },
    { question: '共有ボタンはどこですか？', answer: '連絡帳の詳細画面にある「共有」ボタンをタップしてください。' },
  ],
  check_liff_app: [
    { question: 'どこから確認できますか？', answer: 'LINEを開いて、友だち追加したBlink公式アカウントのトーク画面から確認できます。' },
    { question: '連絡帳が表示されません', answer: '先ほどの「共有」で通知を送った連絡帳が表示されます。LINE通知をタップして確認してみてください。' },
  ],
}

export function TrialHelpButton() {
  const { isTrial, guideCompleted, currentStep } = useTrialStore()
  const [open, setOpen] = useState(false)

  if (!isTrial || guideCompleted || !currentStep) return null

  const helpItems = HELP_CONTENT[currentStep.step_key] || []
  if (helpItems.length === 0) return null

  return (
    <>
      {/* ヘルプボタン */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-30 lg:bottom-auto lg:top-4 lg:right-[316px] bg-card border border-border shadow-lg rounded-full w-10 h-10 flex items-center justify-center hover:bg-muted transition-colors"
        aria-label="ヘルプ"
      >
        <Icon icon="solar:question-circle-linear" className="size-5 text-muted-foreground" />
      </button>

      {/* ヘルプモーダル */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-xl w-full max-w-sm max-h-[70vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">困ったときは</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <Icon icon="solar:close-circle-linear" className="size-5" />
              </button>
            </div>

            <CharacterBubble expression="thinking" size="sm">
              「{currentStep.title}」についてのヒントです。
            </CharacterBubble>

            <div className="space-y-3">
              {helpItems.map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-bold text-foreground">{item.question}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
