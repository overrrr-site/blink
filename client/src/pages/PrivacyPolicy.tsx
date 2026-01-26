import { useNavigate } from 'react-router-dom'
import logoImage from '../assets/logo.png'

export default function PrivacyPolicy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* ヘッダー */}
      <header className="px-5 pt-6 pb-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <iconify-icon icon="solar:arrow-left-linear" width="20" height="20"></iconify-icon>
            <span className="text-sm">戻る</span>
          </button>
          <img src={logoImage} alt="Blink" className="h-8" />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="px-5 py-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold font-heading mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-muted-foreground mb-8">最終更新日: 2026年1月26日</p>

        {/* サービス提供者情報 */}
        <section className="bg-accent/30 rounded-2xl p-6 mb-8">
          <p className="text-sm leading-relaxed mb-4">
            <strong>OVER株式会社</strong>は、LINEミニアプリ「<strong>Blink</strong>」を犬の幼稚園運営事業者様（以下「クライアント」）に提供しています。
          </p>
          <p className="text-sm leading-relaxed mb-4">
            このサービスを提供するにあたり、クライアントの公式なプライバシーポリシーをOVER株式会社のドメイン内で作成しています。
          </p>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-2">【システム提供者】</p>
            <p className="text-sm font-bold">OVER株式会社</p>
            <p className="text-xs text-muted-foreground mt-1">〒150-0021 東京都渋谷区恵比寿西2-8-4</p>
            <p className="text-xs text-muted-foreground">
              <a href="https://www.overrrr.com/company" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                https://www.overrrr.com/company
              </a>
            </p>
          </div>
        </section>

        {/* 第1条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">1</span>
            個人情報の取得について
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本サービスでは、LINEミニアプリを通じて以下の個人情報を取得します。ユーザーが情報提供に同意した場合にのみ、これらの情報を取得・利用いたします。
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>LINEユーザーID</li>
              <li>LINEプロフィール情報（表示名、プロフィール画像）</li>
              <li>お名前、電話番号、メールアドレス</li>
              <li>ご住所</li>
              <li>犬の情報（名前、犬種、生年月日、健康情報等）</li>
              <li>予約・利用履歴</li>
              <li>登園前の健康状態に関する情報</li>
            </ul>
          </div>
        </section>

        {/* 第2条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">2</span>
            第三者への情報提供について
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              ユーザーが情報提供に同意した場合、LINEミニアプリを通じて取得した個人情報は、以下の第三者（実際のサービス提供者）に提供されます。
            </p>
            
            <div className="bg-card rounded-xl p-4 border border-border my-4">
              <p className="text-xs text-muted-foreground mb-2">【情報提供先】</p>
              <p className="text-sm font-bold text-foreground">ご利用の犬の幼稚園運営事業者（クライアント）</p>
              <p className="text-xs text-muted-foreground mt-2">
                ※具体的な事業者名・住所は、各クライアントのサービス利用開始時に別途ご案内いたします。
              </p>
            </div>

            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs font-bold mb-2 text-foreground">【共有される情報】</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
                <li>LINEユーザーID、表示名、プロフィール画像</li>
                <li>お名前、電話番号、メールアドレス、ご住所</li>
                <li>犬の情報（名前、犬種、生年月日、健康情報、ワクチン接種情報等）</li>
                <li>予約・利用履歴、登園前入力情報</li>
                <li>日誌・写真データ</li>
              </ul>
            </div>

            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs font-bold mb-2 text-foreground">【情報提供のタイミング】</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-xs">
                <li>LINEアカウント連携時（初回登録時）</li>
                <li>予約・登園前入力等のサービス利用時</li>
                <li>サービス提供に必要な場合（日誌作成、通知送信等）</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 第3条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">3</span>
            個人情報の利用目的
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>取得した個人情報は、以下の目的で利用いたします。</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>犬の幼稚園サービスの提供・運営</li>
              <li>予約の受付・管理・確認連絡</li>
              <li>登園日誌の作成・共有</li>
              <li>犬の健康管理・安全確保</li>
              <li>サービスに関するお知らせ・ご連絡</li>
              <li>お問い合わせへの対応</li>
              <li>サービスの改善・新サービスの開発</li>
              <li>法令に基づく記録保管義務の履行</li>
            </ul>
          </div>
        </section>

        {/* 第4条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">4</span>
            個人情報の管理
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              当社は、個人情報の漏洩、滅失、毀損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>SSL/TLSによる通信の暗号化</li>
              <li>アクセス権限の適切な管理</li>
              <li>定期的なセキュリティ監査の実施</li>
              <li>従業員への個人情報保護教育の実施</li>
            </ul>
          </div>
        </section>

        {/* 第5条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">5</span>
            個人情報の保存期間
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              動物取扱業に関する法令に基づき、顧客情報・犬情報・利用履歴等は最低5年間保存いたします。
              保存期間経過後は、適切な方法で削除または匿名化いたします。
            </p>
          </div>
        </section>

        {/* 第6条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">6</span>
            個人情報の開示・訂正・削除
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              ユーザーは、当社が保有する自己の個人情報について、開示・訂正・削除を請求することができます。
              ご請求の際は、ご利用の犬の幼稚園事業者またはOVER株式会社までお問い合わせください。
            </p>
          </div>
        </section>

        {/* 第7条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">7</span>
            Cookieの使用について
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本サービスでは、ユーザー体験の向上のためにCookieおよび類似の技術を使用する場合があります。
              これらは認証状態の維持やサービスの利便性向上に使用されます。
            </p>
          </div>
        </section>

        {/* 第8条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">8</span>
            プライバシーポリシーの変更
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              当社は、法令の変更やサービス内容の変更に伴い、本プライバシーポリシーを変更することがあります。
              変更後のプライバシーポリシーは、本ページに掲載した時点で効力を生じるものとします。
            </p>
          </div>
        </section>

        {/* 第9条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">9</span>
            お問い合わせ
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>本プライバシーポリシーに関するお問い合わせは、以下までご連絡ください。</p>
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="font-bold text-foreground">OVER株式会社</p>
              <p className="text-xs mt-1">〒150-0021 東京都渋谷区恵比寿西2-8-4</p>
              <p className="text-xs">
                <a href="https://www.overrrr.com/#contact" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  お問い合わせフォーム
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* フッター */}
        <footer className="pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">© 2026 OVER Inc. All Rights Reserved.</p>
        </footer>
      </main>
    </div>
  )
}
