import { useNavigate } from 'react-router-dom';
import { useLiffAuthStore } from '../store/authStore';
import logoImage from '../../assets/logo.png';

export default function Terms() {
  const navigate = useNavigate();
  const { owner } = useLiffAuthStore();

  // クライアント（犬の幼稚園事業者）情報
  const clientName = owner?.storeName || '（ご利用の犬の幼稚園）';
  const clientAddress = owner?.storeAddress || '（店舗住所）';

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
        <h1 className="text-2xl font-bold font-heading mb-2">サービス利用規約</h1>
        <p className="text-sm text-muted-foreground mb-8">最終更新日: 2026年1月26日</p>

        {/* サービス提供者情報 */}
        <section className="bg-accent/30 rounded-2xl p-6 mb-8">
          <p className="text-sm leading-relaxed mb-4">
            この利用規約（以下「本規約」）は、<strong>OVER株式会社</strong>（以下「当社」）が提供するLINEミニアプリ「<strong>Blink</strong>」（以下「本サービス」）の利用条件を定めるものです。
          </p>
          <p className="text-sm leading-relaxed mb-4">
            本サービスは、<strong>{clientName}</strong>（以下「サービス提供者」）向けに当社が提供するSaaSサービスであり、飼い主様（以下「ユーザー」）はサービス提供者を通じて本サービスをご利用いただきます。
          </p>
          
          {/* サービス提供者（クライアント）*/}
          <div className="bg-card rounded-xl p-4 border border-border mb-3">
            <p className="text-xs text-muted-foreground mb-2">【サービス提供者】</p>
            <p className="text-sm font-bold">{clientName}</p>
            <p className="text-xs text-muted-foreground mt-1">{clientAddress}</p>
          </div>
          
          {/* システム提供者（パートナー）*/}
          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-2">【システム提供者】</p>
            <p className="text-sm font-bold">OVER株式会社</p>
            <p className="text-xs text-muted-foreground mt-1">〒150-0021 東京都渋谷区恵比寿西2-8-4</p>
          </div>
        </section>

        {/* 第1条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">1</span>
            適用範囲
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本規約は、本サービスの提供条件および当社とユーザーとの間の権利義務関係を定めることを目的とし、ユーザーと当社との間の本サービスの利用に関わる一切の関係に適用されます。
            </p>
            <p>
              ユーザーは、本サービスを利用することにより、本規約のすべての条項に同意したものとみなされます。
            </p>
          </div>
        </section>

        {/* 第2条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">2</span>
            サービスの内容
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>本サービスは、<strong>{clientName}</strong>をご利用の飼い主様向けに、以下の機能を提供します。</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>予約の確認・変更・キャンセル</li>
              <li>登園前の健康状態等の入力</li>
              <li>QRコードによる登園・降園チェックイン</li>
              <li>日誌・写真の閲覧</li>
              <li>契約情報・回数券残高の確認</li>
              <li>その他、犬の幼稚園利用に関する各種機能</li>
            </ul>
          </div>
        </section>

        {/* 第3条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">3</span>
            利用登録
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本サービスの利用には、LINEアカウントとの連携および必要情報の登録が必要です。
            </p>
            <p>
              ユーザーは、登録情報について正確かつ最新の情報を提供するものとし、変更があった場合は速やかに更新するものとします。
            </p>
          </div>
        </section>

        {/* 第4条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">4</span>
            禁止事項
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはなりません。</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当社、サービス提供者、他のユーザー、その他第三者の権利を侵害する行為</li>
              <li>虚偽の情報を登録する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>不正アクセス、コンピューターウィルスの送信等の行為</li>
              <li>本サービスを通じて得た情報を商業目的で利用する行為</li>
              <li>他のユーザーになりすます行為</li>
              <li>その他、当社が不適切と判断する行為</li>
            </ul>
          </div>
        </section>

        {/* 第5条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">5</span>
            サービスの停止・中断
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>当社は、以下の場合には、事前の通知なく本サービスの全部または一部の提供を停止または中断することができるものとします。</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>本サービスにかかるシステムの保守点検または更新を行う場合</li>
              <li>地震、落雷、火災、停電等の不可抗力により本サービスの提供が困難となった場合</li>
              <li>コンピューターまたは通信回線等が事故により停止した場合</li>
              <li>その他、当社が本サービスの提供が困難と判断した場合</li>
            </ul>
          </div>
        </section>

        {/* 第6条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">6</span>
            免責事項
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              当社は、本サービスに事実上または法律上の瑕疵（安全性、信頼性、正確性、完全性、有効性、特定の目的への適合性、セキュリティなどに関する欠陥、エラーやバグ、権利侵害などを含みます）がないことを明示的にも黙示的にも保証しておりません。
            </p>
            <p>
              当社は、本サービスに起因してユーザーに生じたあらゆる損害について、当社の故意または重大な過失による場合を除き、一切の責任を負いません。
            </p>
            <p>
              犬の幼稚園サービス自体に関する責任は、<strong>{clientName}</strong>が負うものとし、当社はこれについて責任を負いません。
            </p>
          </div>
        </section>

        {/* 第7条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">7</span>
            知的財産権
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本サービスに関する著作権、商標権その他の知的財産権は、当社または正当な権利者に帰属します。
              ユーザーは、これらの権利を侵害する行為を行ってはなりません。
            </p>
          </div>
        </section>

        {/* 第8条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">8</span>
            利用規約の変更
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              当社は、必要と判断した場合には、ユーザーに通知することなくいつでも本規約を変更することができるものとします。
              変更後の利用規約は、本ページに掲載した時点で効力を生じるものとします。
            </p>
            <p>
              変更後も本サービスの利用を継続した場合、ユーザーは変更後の規約に同意したものとみなされます。
            </p>
          </div>
        </section>

        {/* 第9条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">9</span>
            準拠法・裁判管轄
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              本規約の解釈にあたっては、日本法を準拠法とします。
            </p>
            <p>
              本サービスに関して紛争が生じた場合には、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </div>
        </section>

        {/* 第10条 */}
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="size-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary text-sm font-bold">10</span>
            お問い合わせ
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>本規約に関するお問い合わせは、以下までご連絡ください。</p>
            
            {/* サービス提供者（クライアント）への問い合わせ */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-2">【サービスに関するお問い合わせ】</p>
              <p className="font-bold text-foreground">{clientName}</p>
              {owner?.storeAddress && (
                <p className="text-xs mt-1">{clientAddress}</p>
              )}
            </div>
            
            {/* システム提供者（パートナー）への問い合わせ */}
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">【システムに関するお問い合わせ】</p>
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
  );
}
