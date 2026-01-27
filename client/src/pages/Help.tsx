import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface HelpSection {
  id: string
  title: string
  icon: string
  content: Array<{
    question: string
    answer: string
    steps?: string[]
  }>
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'はじめに',
    icon: 'solar:book-bookmark-bold',
    content: [
      {
        question: 'Blinkとは？',
        answer: 'Blinkは犬の幼稚園向けの顧客管理システムです。予約管理、顧客情報管理、日誌作成、トレーニング記録などの機能を提供します。',
      },
      {
        question: '基本的な使い方',
        answer: '画面下部のナビゲーションバーから各機能にアクセスできます。「今日」タブで本日の予約を確認、「予定」タブでカレンダー表示、「顧客」タブで顧客管理、「設定」タブで各種設定を行います。',
      },
      {
        question: '新規作成の方法',
        answer: '画面下部中央の「+」ボタン（FABボタン）をタップすると、予約・顧客・日誌の新規作成メニューが表示されます。',
      },
    ],
  },
  {
    id: 'reservations',
    title: '予約管理',
    icon: 'solar:calendar-bold',
    content: [
      {
        question: '予約の作成方法',
        answer: 'FABボタンから「予約を追加」を選択するか、「予定」タブから新規予約ボタンをタップします。',
        steps: [
          '日付と時間を選択',
          '登園する犬を選択（未登録の場合は先に顧客登録が必要）',
          'コースやメモを入力',
          '保存ボタンをタップ',
        ],
      },
      {
        question: '予約の編集・キャンセル',
        answer: '予約カレンダーまたは予約詳細画面から、予約をタップして編集・キャンセルができます。',
      },
      {
        question: 'チェックインの方法',
        answer: '「今日」タブの予約カードから「チェックイン」ボタンをタップすると、登園時刻を記録できます。',
      },
      {
        question: '登園前入力とは',
        answer: '飼い主がLINEミニアプリから、登園当日の朝に入力する情報です。排泄状況（今朝・昨夜のオシッコ/ウンチ）、朝ごはんの食べ具合、体調の変化、連絡事項などを事前に把握できます。',
      },
      {
        question: '登園前入力の確認方法',
        answer: '「今日」タブの予約カードを展開すると、飼い主が入力した登園前情報を確認できます。入力済みの予約には「登園前入力あり」のバッジが表示されます。',
        steps: [
          '「今日」タブを開く',
          '確認したい予約カードをタップして展開',
          '「登園前入力」セクションで排泄・食事・体調・連絡事項を確認',
        ],
      },
      {
        question: '登園前入力の活用方法',
        answer: '登園前情報を確認することで、その日の犬のケアに役立てることができます。例えば、朝ごはんを食べていない場合は体調に注意する、昨夜からウンチが出ていない場合はトイレ誘導を増やすなど、個別対応が可能になります。',
      },
    ],
  },
  {
    id: 'customers',
    title: '顧客管理',
    icon: 'solar:users-group-rounded-bold',
    content: [
      {
        question: '飼い主の登録方法',
        answer: 'FABボタンから「顧客を登録」を選択するか、「顧客」タブから新規登録ボタンをタップします。',
        steps: [
          '飼い主の基本情報（氏名、電話番号、メールアドレス、住所）を入力',
          '保存ボタンをタップ',
          '続けて犬の情報を登録',
        ],
      },
      {
        question: '犬の登録方法',
        answer: '飼い主詳細画面から「犬を追加」ボタンをタップして、犬の情報を登録します。',
        steps: [
          '基本情報（名前、犬種、生年月日、性別、体重、毛色など）を入力',
          '健康情報（ワクチン接種歴、アレルギー、持病など）を入力',
          '性格情報（性格、好きなこと、苦手なことなど）を入力',
          '保存ボタンをタップ',
        ],
      },
      {
        question: '顧客情報の検索',
        answer: '「顧客」タブの検索バーから、飼い主名や犬名で検索できます。',
      },
      {
        question: '契約情報の管理',
        answer: '犬詳細画面の「契約」セクションから、コース契約の登録・編集ができます。契約期間や料金を設定できます。',
      },
    ],
  },
  {
    id: 'journals',
    title: '日誌作成',
    icon: 'solar:notebook-bold',
    content: [
      {
        question: '日誌の作成方法',
        answer: 'FABボタンから「日誌を作成」を選択するか、予約詳細画面から「日誌を作成」ボタンをタップします。',
        steps: [
          '写真を追加（複数枚可）',
          'メモ書きを入力（走り書きでOK）',
          '「AIでコメントを生成」ボタンで自動生成、または手動でコメントを入力',
          '詳細情報（トイレ記録、トレーニング記録など）を入力',
          '保存ボタンをタップ',
        ],
      },
      {
        question: 'AIコメント生成機能',
        answer: 'メモ書き、写真解析結果、トレーニング記録を元に、飼い主さんへの自然なコメントを自動生成します。生成後は自由に編集できます。',
      },
      {
        question: '写真解析機能',
        answer: '写真を追加すると、AIが写真を分析して活動内容やトレーニング項目を提案します。提案された内容は手動で追加できます。',
      },
      {
        question: 'トレーニング記録の入力',
        answer: '日誌作成画面の「詳細」ステップで、各トレーニング項目の達成度（○/△/−）を記録できます。設定画面でトレーニング項目をカスタマイズできます。',
      },
    ],
  },
  {
    id: 'training',
    title: 'トレーニング記録',
    icon: 'solar:star-bold',
    content: [
      {
        question: 'トレーニング項目の設定',
        answer: '「設定」タブの「トレーニング項目」セクションから、店舗独自のトレーニング項目を追加・編集・削除できます。',
        steps: [
          'カテゴリ（トイレ、基本、社会化など）を選択',
          '項目キー（英数字）と項目名を入力',
          '表示順を設定',
          '保存ボタンをタップ',
        ],
      },
      {
        question: '日誌での記録方法',
        answer: '日誌作成時に、設定したトレーニング項目の達成度を記録できます。記録した内容はAIコメント生成にも反映されます。',
      },
    ],
  },
  {
    id: 'settings',
    title: '設定',
    icon: 'solar:settings-bold',
    content: [
      {
        question: '店舗情報の設定',
        answer: '「設定」タブの「店舗設定」から、店舗名、住所、電話番号、営業時間などを設定できます。',
      },
      {
        question: 'スタッフ管理',
        answer: '「設定」タブの「スタッフ管理」から、スタッフの追加・編集・削除、招待メールの送信ができます。',
      },
      {
        question: 'コース設定',
        answer: '「設定」タブの「コース管理」から、提供するコース（半日コース、1日コースなど）の登録・編集ができます。',
      },
      {
        question: 'Googleカレンダー連携',
        answer: '「設定」タブの「連携」から、Googleカレンダーと連携して予約を自動同期できます。',
      },
      {
        question: 'LINE公式アカウント連携とは',
        answer: 'LINE公式アカウントと連携することで、飼い主さんへの通知送信、LINEミニアプリでの予約管理、チャットボットによる自動応答が利用できるようになります。',
      },
      {
        question: 'LINE Developersコンソールへのアクセス',
        answer: 'LINE連携の設定には、LINE Developersコンソールでの操作が必要です。初めての方は以下の手順でチャネルを作成してください。',
        steps: [
          'LINE Developersコンソール（https://developers.line.biz/）にアクセス',
          '右上の「ログイン」からLINEアカウントでログイン',
          '初めての場合は「プロバイダーを作成」をクリック',
          'プロバイダー名（店舗名など）を入力して作成',
          '「チャネルを作成」→「Messaging API」を選択',
          'チャネル名、説明、業種などを入力して作成',
        ],
      },
      {
        question: 'チャネルIDの確認方法',
        answer: 'チャネルIDはLINE Developersコンソールで確認できます。',
        steps: [
          'LINE Developersコンソールにログイン',
          '作成したプロバイダーを選択',
          '対象のMessaging APIチャネルを選択',
          '「チャネル基本設定」タブを開く',
          '「チャネルID」欄に表示されている数字をコピー',
        ],
      },
      {
        question: 'チャネルシークレットの確認方法',
        answer: 'チャネルシークレットはLINE Developersコンソール、またはLINE Official Account Managerから確認できます。',
        steps: [
          '【方法1: LINE Developersコンソール】',
          'チャネル基本設定タブを開く',
          '「チャネルシークレット」欄の値をコピー',
          '【方法2: LINE Official Account Manager】',
          'LINE Official Account Manager（https://manager.line.biz/）にアクセス',
          '対象のアカウントを選択 → 「設定」→「Messaging API」を開く',
          '「Channel secret」欄の値をコピー',
        ],
      },
      {
        question: 'チャネルアクセストークンの発行方法',
        answer: 'チャネルアクセストークンはLINE Developersコンソールで発行します。一度発行したトークンは再表示できないため、必ずコピーして保存してください。',
        steps: [
          'LINE Developersコンソールにログイン',
          '対象のMessaging APIチャネルを選択',
          '「Messaging API設定」タブを開く',
          'ページを一番下までスクロール',
          '「チャネルアクセストークン」欄の「発行」ボタンをクリック',
          '表示されたトークン（長い文字列）をコピーして保存',
        ],
      },
      {
        question: 'Webhook URLの設定方法',
        answer: 'チャットボット機能を使うには、LINE DevelopersコンソールでWebhook URLを設定する必要があります。Webhook URLは設定画面の「連携」タブに表示されています。',
        steps: [
          'LINE Developersコンソールにログイン',
          '対象のMessaging APIチャネルを選択',
          '「Messaging API設定」タブを開く',
          '「Webhook URL」欄の「編集」をクリック',
          'BlinkのWebhook URL（設定画面に表示されています）を入力',
          '「更新」をクリックして保存',
          '「Webhookの利用」をONに設定',
          '「検証」ボタンで接続テストを実施（「成功」と表示されればOK）',
        ],
      },
      {
        question: 'LINE応答設定の変更',
        answer: 'チャットボット機能を使う場合、LINE公式アカウントの応答設定を変更する必要があります。',
        steps: [
          'LINE Official Account Manager（https://manager.line.biz/）にアクセス',
          '対象のアカウントを選択',
          '「設定」→「応答設定」を開く',
          '「応答モード」を「Bot」に変更',
          '「あいさつメッセージ」を必要に応じてOFF',
          '「応答メッセージ」をOFFに設定（Blinkのボットが応答するため）',
        ],
      },
      {
        question: '通知設定',
        answer: '「設定」タブの「連携」から、登園前リマインド、日誌送信通知、ワクチン期限アラートのON/OFFを設定できます。',
      },
    ],
  },
  {
    id: 'line-features',
    title: 'LINE通知・飼い主向け機能',
    icon: 'solar:chat-round-bold',
    content: [
      {
        question: 'LINE通知機能でできること',
        answer: 'LINE連携が完了すると、飼い主さんへ以下の通知を自動送信できます。設定タブの「連携」から各通知のON/OFFを設定できます。',
        steps: [
          '登園前リマインド通知（前日18:00に自動送信）',
          '日誌送信通知（日誌作成時に飼い主へ通知）',
          'ワクチン期限アラート（期限30日前・14日前に通知）',
        ],
      },
      {
        question: 'LINEミニアプリ（飼い主向けアプリ）とは',
        answer: '飼い主さんがLINEアプリ内で予約確認・登園前入力・日誌閲覧などができる機能です。店舗のLINE公式アカウントを友だち追加すると利用できます。',
      },
      {
        question: '登園前入力機能',
        answer: '飼い主さんがLINEミニアプリから、登園当日の朝に排泄状況・朝食の食べ具合・体調変化・連絡事項を入力できます。入力内容は「今日」タブの予約カードを展開すると確認できます。',
        steps: [
          '飼い主がLINEからミニアプリを開く',
          '「登園前情報を入力する」ボタンをタップ',
          '排泄（今朝/昨夜のオシッコ・ウンチ）・食事・体調・連絡事項を入力して送信',
          'スタッフは予約カードの展開で内容を確認',
        ],
      },
      {
        question: 'LINEチャットボット機能',
        answer: '飼い主さんがLINEトーク画面からメッセージを送ると、自動で予約確認・日誌閲覧などができます。設定タブの「LINEチャットボット設定」でON/OFFを切り替えられます。',
        steps: [
          '「予約確認」「予約」→ 今後の予約一覧を表示',
          '「予約する」「予約したい」→ 予約作成画面を開く',
          '「キャンセル」→ 予約をキャンセル',
          '「日誌」「日報」「記録」→ 日誌一覧を表示',
          '「契約」「残回数」「チケット」→ 契約情報と残回数を表示',
          '「ヘルプ」「使い方」→ 使い方ガイドを表示',
        ],
      },
    ],
  },
  {
    id: 'qr-checkin',
    title: 'QRコード登園',
    icon: 'solar:qr-code-bold',
    content: [
      {
        question: 'QRコード登園とは',
        answer: '店舗に設置したQRコードを飼い主さんがスキャンすることで、登園・降園の記録ができます。LINEミニアプリのカメラ機能を使用します。',
      },
      {
        question: 'QRコード登園の使い方（飼い主向け）',
        answer: '飼い主さんはLINEミニアプリのホーム画面から「登園する」または「退園する」ボタンをタップし、店舗のQRコードをスキャンします。',
        steps: [
          'LINEミニアプリを開く',
          '「登園する（QRコードスキャン）」をタップ',
          '店舗のQRコードをカメラで読み取る',
          'チェックイン完了',
        ],
      },
      {
        question: 'QRコードスキャンができない場合',
        answer: 'カメラ権限が許可されていない、またはLINEアプリ外からアクセスしている可能性があります。',
        steps: [
          '【iPhoneの場合】設定アプリ → LINE → カメラをON',
          '【Androidの場合】設定 → アプリ → LINE → 権限 → カメラを許可',
          '解決しない場合は、スタッフにお声がけいただき手動でチェックイン',
        ],
      },
    ],
  },
  {
    id: 'faq',
    title: 'よくある質問・トラブル',
    icon: 'solar:help-bold',
    content: [
      {
        question: 'LINE通知が飼い主に届かない',
        answer: 'LINE通知が届かない場合、以下を順番に確認してください。',
        steps: [
          '設定タブ → 連携 → 「LINE通知を有効にする」がONか確認',
          '顧客情報にLINE IDが登録されているか確認（飼い主がLINEミニアプリにログインすると自動登録されます）',
          'LINE公式アカウント連携の設定（チャネルID/シークレット/アクセストークン）が正しいか確認',
          'テストメッセージ送信で接続を確認',
        ],
      },
      {
        question: '飼い主がLINEミニアプリにログインできない',
        answer: 'ログインできない場合、以下の原因が考えられます。',
        steps: [
          '店舗のLINE公式アカウントを友だち追加していない',
          'LINEアプリ内からではなくブラウザからアクセスしている',
          '電話番号が店舗に登録されている情報と一致しない',
          '解決しない場合は、顧客詳細画面から「アカウント連携」を手動で設定',
        ],
      },
      {
        question: '予約リマインドが送信されない',
        answer: '予約リマインドは前日18:00に自動送信されます。以下を確認してください。',
        steps: [
          '設定タブ → 連携 → 「登園前リマインド」がONか確認',
          '「LINE通知を有効にする」がONか確認',
          '飼い主のLINE IDが登録されているか確認（顧客詳細画面で確認）',
          '予約が「予定」ステータスになっているか確認（キャンセル済みは送信されません）',
        ],
      },
      {
        question: 'チャットボットが応答しない',
        answer: 'チャットボット機能が動作しない場合、以下を確認してください。',
        steps: [
          '設定タブ → LINEチャットボット設定 → 「チャットボットを有効にする」がONか確認',
          'Webhook URLがLINE Developersコンソールに正しく設定されているか確認',
          'LINE Developersコンソールで「Webhookの利用」がONか確認',
          'LINE Official Account Managerで「応答モード」が「Bot」になっているか確認',
          '「応答メッセージ」がOFFになっているか確認',
        ],
      },
      {
        question: 'AI日誌コメントが生成されない',
        answer: 'AIコメント生成には、メモ書きまたは写真が必要です。',
        steps: [
          '日誌作成画面でメモ書きを入力するか、写真を追加してください',
          '「AIでコメントを生成」ボタンをタップ',
          '生成に数秒かかる場合があります',
          'エラーが続く場合は、インターネット接続を確認してください',
        ],
      },
      {
        question: '飼い主に日誌が届かない',
        answer: '日誌送信通知が届かない場合、以下を確認してください。',
        steps: [
          '設定タブ → 連携 → 「日誌送信通知」がONか確認',
          '飼い主のLINE IDが登録されているか確認',
          '日誌を保存した後、「送信」ボタンを押したか確認',
          '下書き保存のみでは通知は送信されません',
        ],
      },
    ],
  },
  {
    id: 'contact',
    title: 'お問い合わせ',
    icon: 'solar:question-circle-bold',
    content: [
      {
        question: 'サポートへの連絡方法',
        answer: 'ご不明な点やお困りのことがございましたら、以下の方法でお問い合わせください。',
      },
      {
        question: 'メールでのお問い合わせ',
        answer: 'info@overrrr.com までメールでお問い合わせください。通常1〜2営業日以内にご返信いたします。',
      },
      {
        question: 'お問い合わせの際のお願い',
        answer: 'スムーズな対応のため、以下の情報をお知らせいただけると助かります：店舗名、発生している問題の詳細、エラーメッセージ（表示されている場合）、スクリーンショット（可能な場合）',
      },
    ],
  },
]

const Help = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['getting-started']))
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 検索でフィルタリング
  const filteredSections = HELP_SECTIONS.map((section) => {
    if (!searchQuery) return section

    const filteredContent = section.content.filter(
      (item) =>
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (filteredContent.length === 0) return null

    return {
      ...section,
      content: filteredContent,
    }
  }).filter((section): section is HelpSection => section !== null)

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  return (
    <div className="pb-6">
      {/* ヘッダー */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => navigate('/settings')}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">ヘルプ・サポート</h1>
      </header>

      <main className="px-5 pt-4 space-y-4">
        {/* 検索バー */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center gap-3">
            <iconify-icon
              icon="solar:magnifer-bold"
              className="size-6 text-primary shrink-0"
            ></iconify-icon>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ヘルプを検索..."
              className="flex-1 px-4 py-3 bg-muted/50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* ヘルプセクション */}
        {filteredSections.length === 0 ? (
          <div className="text-center py-12">
            <iconify-icon icon="solar:magnifer-bold" width="48" height="48" className="text-muted-foreground mx-auto mb-3"></iconify-icon>
            <p className="text-muted-foreground">検索結果が見つかりませんでした</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSections.map((section) => (
              <div key={section.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* セクションヘッダー */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-muted/30 transition-colors min-h-[56px]"
                >
                  <div className="flex items-center gap-3">
                    <iconify-icon icon={section.icon} className="size-5 text-primary"></iconify-icon>
                    <span className="font-bold text-sm">{section.title}</span>
                  </div>
                  <iconify-icon
                    icon={expandedSections.has(section.id) ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                    className="size-5 text-muted-foreground"
                  ></iconify-icon>
                </button>

                {/* セクションコンテンツ */}
                {expandedSections.has(section.id) && (
                  <div className="border-t border-border">
                    {section.content.map((item, index) => {
                      const itemId = `${section.id}-${index}`
                      return (
                        <div key={itemId} className="border-b border-border last:border-b-0">
                          <button
                            onClick={() => toggleItem(itemId)}
                            className="w-full px-5 py-3 flex items-start justify-between text-left hover:bg-muted/20 transition-colors min-h-[48px]"
                          >
                            <span className="text-sm font-medium flex-1 pr-4">{item.question}</span>
                            <iconify-icon
                              icon={expandedItems.has(itemId) ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                              className="size-4 text-muted-foreground flex-shrink-0 mt-0.5"
                            ></iconify-icon>
                          </button>
                          {expandedItems.has(itemId) && (
                            <div className="px-5 pb-4 pt-2 space-y-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
                              {item.steps && item.steps.length > 0 && (
                                <ol className="space-y-2">
                                  {item.steps.map((step, stepIndex) => (
                                    <li key={stepIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                                      <span className="flex-shrink-0 size-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                                        {stepIndex + 1}
                                      </span>
                                      <span className="flex-1">{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* お問い合わせセクション */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <iconify-icon icon="solar:question-circle-bold" className="size-5 text-primary"></iconify-icon>
            <h3 className="font-bold text-sm">まだ解決しませんか？</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            ご不明な点がございましたら、お気軽にお問い合わせください。
          </p>
          <button
            onClick={() => window.open('mailto:info@overrrr.com?subject=Blinkに関するお問い合わせ', '_blank')}
            className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors min-h-[48px]"
          >
            <iconify-icon icon="solar:letter-bold" className="size-4 inline-block mr-2"></iconify-icon>
            メールでお問い合わせ
          </button>
        </div>
      </main>
    </div>
  )
}

export default Help
