import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { Icon } from '../components/Icon'

const LandingPage = () => {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAuthStore()

  // ログイン済みならダッシュボードへ
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading) return null

  return (
    <div className="lp">
      <style>{lpStyles}</style>

      {/* Header */}
      <header className="lp-header">
        <div className="lp-header-inner">
          <img src="/lp/Blink.png" alt="Blink" className="lp-header-logo" />
          <Link to="/login" className="lp-header-login">ログイン</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-snap hero">
        <img src="/lp/Blink.png" alt="Blink" className="hero-logo-img" />
        <h1 className="hero-title">通じ合う時間を、<br />もっと。</h1>
        <p className="hero-subtitle">犬の幼稚園のための業務管理システム。<br />LINE予約、AI日報、チケット管理をひとつに。</p>
        <Link to="/login" className="hero-cta">初月無料ではじめる</Link>
      </section>

      {/* Problem + Solution */}
      <section className="lp-snap headline-section">
        <div className="headline-content">
          <h2 className="headline-title">ワンちゃんと<br />向き合う時間、<br />足りていますか</h2>
          <p className="headline-desc">電話対応、日報作成、チケットの残数確認。<br />本来の仕事以外に、時間を取られていませんか。</p>
          <div className="solution-block">
            <p className="solution-arrow">\</p>
            <img src="/lp/Blink.png" alt="Blink" className="solution-logo" />
            <p className="solution-arrow">/</p>
            <p className="solution-label">なら、ぜんぶ解決</p>
          </div>
        </div>
      </section>

      {/* Dashboard Feature */}
      <section className="lp-snap feature-pair">
        <div className="feature-text">
          <div className="feature-text-inner">
            <p className="feature-visual-eyebrow">Dashboard</p>
            <h2 className="feature-visual-title">今日の予定を<br />ひと目で把握</h2>
            <p className="feature-visual-desc">時間帯ごとの登園予定、未入力の日誌、確認事項。その日にやるべきことがダッシュボードに集約されます。</p>
            <ul className="feature-list">
              <li><Icon icon="solar:clock-circle-bold" width={22} height={22} className="feature-icon" />時間帯別の登園スケジュール</li>
              <li><Icon icon="solar:bell-bing-bold" width={22} height={22} className="feature-icon" />未完了タスクのリマインド</li>
              <li><Icon icon="solar:shield-check-bold" width={22} height={22} className="feature-icon" />ワクチン期限切れアラート</li>
            </ul>
          </div>
        </div>
        <div className="feature-img light">
          <div className="screen-mockup">
            <img src="/lp/screenshots/01_dashboard.png" alt="ダッシュボード画面" />
          </div>
        </div>
      </section>

      {/* Calendar Feature */}
      <section className="lp-snap feature-pair">
        <div className="feature-text">
          <div className="feature-text-inner">
            <p className="feature-visual-eyebrow">Reservation</p>
            <h2 className="feature-visual-title">予約管理を<br />カレンダーで</h2>
            <p className="feature-visual-desc">月間の予約状況をカレンダー表示。日付をタップすれば、その日の予約一覧がすぐに確認できます。</p>
            <ul className="feature-list">
              <li><Icon icon="solar:calendar-bold" width={22} height={22} className="feature-icon" />月間カレンダー表示</li>
              <li><Icon icon="solar:users-group-rounded-bold" width={22} height={22} className="feature-icon" />日別の予約件数を可視化</li>
              <li><Icon icon="solar:calendar-mark-bold" width={22} height={22} className="feature-icon" />ダブルブッキング防止</li>
            </ul>
          </div>
        </div>
        <div className="feature-img light">
          <div className="screen-mockup">
            <img src="/lp/screenshots/04_reservation_calendar.png" alt="予約カレンダー画面" />
          </div>
        </div>
      </section>

      {/* LINE Feature */}
      <section className="lp-snap line-pair">
        <div className="line-text">
          <div className="line-text-inner">
            <p className="headline-eyebrow" style={{ color: 'rgba(255,255,255,0.7)' }}>LINE Integration</p>
            <h2 className="headline-title" style={{ color: '#fff' }}>お客様の操作は<br />LINEで完結</h2>
            <p className="headline-desc" style={{ color: 'rgba(255,255,255,0.85)' }}>予約から日報の受け取りまで、すべてLINEで。新しいアプリのインストールは不要です。</p>
            <div className="line-features">
              <div className="line-feature-card">
                <Icon icon="solar:calendar-check-bold" width={28} height={28} />
                <h4>24時間予約</h4>
                <p>営業時間外も自動受付</p>
              </div>
              <div className="line-feature-card">
                <Icon icon="solar:qr-code-bold" width={28} height={28} />
                <h4>QRチェックイン</h4>
                <p>読み込むだけで登園完了</p>
              </div>
              <div className="line-feature-card">
                <Icon icon="solar:clipboard-text-bold" width={28} height={28} />
                <h4>事前連絡</h4>
                <p>体調・食事を入力</p>
              </div>
              <div className="line-feature-card">
                <Icon icon="solar:gallery-bold" width={28} height={28} />
                <h4>日報配信</h4>
                <p>写真付きで自動送信</p>
              </div>
            </div>
          </div>
        </div>
        <div className="line-phone">
          <div className="phone-mockup">
            <div className="phone-screen">
              <img src="/lp/screenshots/07_liff_home.png" alt="LINEミニアプリ ホーム画面" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Feature */}
      <section className="lp-snap feature-pair">
        <div className="feature-text">
          <div className="feature-text-inner">
            <p className="feature-visual-eyebrow">AI-Powered</p>
            <h2 className="feature-visual-title">日報作成、<br />10分から1分へ</h2>
            <p className="feature-visual-desc">写真をアップロードすると、AIがコメントを提案。第一種動物取扱業の5年保管義務にも対応しています。</p>
            <ul className="feature-list">
              <li><Icon icon="solar:magic-stick-3-bold" width={22} height={22} className="feature-icon" />AIコメント自動生成</li>
              <li><Icon icon="solar:camera-bold" width={22} height={22} className="feature-icon" />写真から活動を解析</li>
              <li><Icon icon="solar:cloud-check-bold" width={22} height={22} className="feature-icon" />5年間の自動保管</li>
            </ul>
          </div>
        </div>
        <div className="feature-img light">
          <div className="screen-mockup">
            <img src="/lp/screenshots/06_journal_ai_comment.png" alt="AI日報作成画面" />
          </div>
        </div>
      </section>

      {/* Ticket Feature */}
      <section className="lp-snap feature-pair">
        <div className="feature-text">
          <div className="feature-text-inner">
            <p className="feature-visual-eyebrow">Auto Management</p>
            <h2 className="feature-visual-title">回数券の残数、<br />もう数えない</h2>
            <p className="feature-visual-desc">予約と連動して自動消費。キャンセル時はチケットが自動で復活。お客様もLINEで残数を確認できます。</p>
            <ul className="feature-list">
              <li><Icon icon="solar:calendar-check-bold" width={22} height={22} className="feature-icon" />予約確定で自動消費</li>
              <li><Icon icon="solar:refresh-bold" width={22} height={22} className="feature-icon" />キャンセル時は自動復活</li>
              <li><Icon icon="solar:smartphone-bold" width={22} height={22} className="feature-icon" />LINEで残数確認</li>
            </ul>
          </div>
        </div>
        <div className="feature-img light">
          <div className="screen-mockup">
            <img src="/lp/screenshots/10_ticket_management.png" alt="チケット管理画面" />
          </div>
        </div>
      </section>

      {/* Company */}
      <section className="lp-snap company-section">
        <div className="company-content">
          <img src="/lp/over.png" alt="OVER Inc." className="company-logo-img" />
          <p className="company-tagline">ペットとともに、社会と地域の未来を創る</p>
          <h2 className="company-title">ペット業界を知る<br />会社が開発しました</h2>
          <p className="company-desc">OVER株式会社は、ペット防災やペットツーリズムなど、ペットと社会をつなぐ事業を手がけてきました。犬の幼稚園の運営者の声をもとに、現場で本当に必要な機能を搭載。導入後もペット業界を熟知したスタッフがサポートします。</p>
          <div className="company-projects">
            <h4>主なプロジェクト実績</h4>
            <ul className="project-list">
              <li className="project-item">愛知県「ペット同行避難」普及啓発</li>
              <li className="project-item">茨城県・群馬県 ペットツーリズム推進</li>
              <li className="project-item">ペット関連企業の新規事業支援</li>
              <li className="project-item">ペット防災・共生社会リサーチ</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="lp-snap final-cta">
        <h2 className="final-cta-title">まずは1ヶ月、<br />無料で</h2>
        <p className="final-cta-desc">クレジットカード登録不要。すべての機能を初月無料でお試しいただけます。</p>
        <div className="cta-buttons">
          <Link to="/login" className="hero-cta">初月無料ではじめる</Link>
        </div>
        <div className="trust-badges">
          <div className="trust-badge">
            <Icon icon="solar:gift-bold" width={24} height={24} />
            初月完全無料
          </div>
          <div className="trust-badge">
            <Icon icon="solar:card-recive-bold" width={24} height={24} />
            クレカ登録不要
          </div>
          <div className="trust-badge">
            <Icon icon="solar:headphones-round-bold" width={24} height={24} />
            無料導入サポート
          </div>
        </div>
      </section>

    </div>
  )
}

const lpStyles = `
  .lp {
    --color-primary: #F97316;
    --color-primary-dark: #EA580C;
    --color-primary-light: #FDBA74;
    --color-primary-pale: #FFF7ED;
    --color-primary-bg: #FEF3E8;
    --color-success: #22C55E;
    --color-bg-warm: #FFFBF7;
    --color-bg-white: #FFFFFF;
    --color-bg-dark: #1C1917;
    --color-text-dark: #1C1917;
    --color-text-secondary: #57534E;
    --color-text-muted: #A8A29E;
    --color-text-light: #FAFAF9;
    --color-border: #F5F5F4;
    --color-border-dark: #E7E5E4;
    --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
    font-family: 'Noto Sans JP', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    background: var(--color-bg-warm);
    color: var(--color-text-dark);
    overflow-x: hidden;
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    height: 100vh;
    height: 100dvh;
  }

  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; }

  /* ===== HEADER ===== */
  .lp-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    padding: 16px 24px;
    background: rgba(255, 251, 247, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.03);
  }
  .lp-header-inner {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .lp-header-logo {
    height: 40px;
  }
  .lp-header-login {
    display: inline-flex;
    align-items: center;
    padding: 8px 24px;
    background: rgba(28, 25, 23, 0.7);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #fff;
    text-decoration: none;
    border-radius: 100px;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s var(--ease-out-expo);
    min-height: 40px;
  }
  .lp-header-login:hover {
    background: rgba(68, 64, 60, 0.85);
    transform: scale(1.05);
  }

  .lp-snap {
    min-height: 100vh;
    min-height: 100dvh;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    scroll-snap-align: start;
  }

  /* ===== HERO ===== */
  .hero {
    background: var(--color-bg-warm);
    text-align: center;
    padding: 120px 24px;
    flex-direction: column;
  }
  .hero-logo-img {
    height: clamp(120px, 20vw, 200px);
    margin-bottom: 48px;
  }
  .hero-title {
    font-size: clamp(48px, 10vw, 112px);
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    margin: 0 0 32px;
    color: var(--color-text-dark);
  }
  .hero-subtitle {
    font-size: clamp(17px, 2.2vw, 22px);
    font-weight: 400;
    color: var(--color-text-secondary);
    max-width: 560px;
    margin: 0 auto 56px;
    line-height: 1.7;
  }
  .hero-cta {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 18px 44px;
    background: var(--color-primary);
    color: #fff;
    text-decoration: none;
    border-radius: 100px;
    font-size: 17px;
    font-weight: 600;
    transition: all 0.4s var(--ease-out-expo);
  }
  .hero-cta:hover {
    transform: scale(1.05);
    background: var(--color-primary-dark);
    box-shadow: 0 24px 64px rgba(249, 115, 22, 0.35);
  }

  /* ===== HEADLINE ===== */
  .headline-section {
    background: var(--color-bg-warm);
    padding: 80px 24px;
  }
  .headline-content { text-align: center; max-width: 1000px; margin: 0 auto; }
  .headline-eyebrow {
    font-size: 13px; font-weight: 600; color: var(--color-primary);
    letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 24px;
  }
  .headline-title {
    font-size: clamp(36px, 7vw, 72px); font-weight: 800;
    letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 24px;
  }
  .headline-desc {
    font-size: clamp(17px, 2vw, 21px); color: var(--color-text-secondary);
    line-height: 1.7; max-width: 600px; margin: 0 auto;
  }

  /* ===== FEATURE SECTIONS (flat structure) ===== */
  .feature-text {
    background: var(--color-bg-warm);
    padding: 80px 64px;
  }
  .feature-text-inner {
    max-width: 560px;
  }
  .feature-visual-eyebrow {
    font-size: 13px; font-weight: 600; color: var(--color-primary);
    letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 20px;
  }
  .feature-visual-title {
    font-size: clamp(32px, 5vw, 56px); font-weight: 800;
    letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 24px;
    color: var(--color-text-dark);
  }
  .feature-visual-desc {
    font-size: 18px; color: var(--color-text-secondary);
    line-height: 1.7; margin: 0 0 40px; max-width: 480px;
  }
  .feature-list {
    list-style: none; display: flex; flex-direction: column;
    gap: 16px; margin: 0; padding: 0;
  }
  .feature-list li {
    display: flex; align-items: center; gap: 14px;
    font-size: 16px; color: var(--color-text-dark);
  }
  .feature-icon { color: var(--color-primary); flex-shrink: 0; }

  .feature-img {
    padding: 48px;
  }
  .feature-img.light {
    background: linear-gradient(135deg, #FEF3E8 0%, #FFEDD5 100%);
  }
  .screen-mockup {
    width: 100%; max-width: 480px; border-radius: 20px; overflow: hidden;
    box-shadow: 0 40px 80px -20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
    position: relative; z-index: 1; background: #fff;
  }
  .screen-mockup img { width: 100%; height: auto; display: block; }

  /* ===== LINE ===== */
  .line-text {
    background: var(--color-primary); color: #fff;
    padding: 80px 24px; flex-direction: column;
  }
  .line-text-inner {
    max-width: 600px; text-align: center;
  }
  .line-text-inner .headline-desc { margin-bottom: 48px; }
  .line-features { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .line-feature-card {
    background: rgba(255,255,255,0.18); backdrop-filter: blur(20px);
    border-radius: 16px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);
    transition: all 0.3s var(--ease-out-expo);
  }
  .line-feature-card:hover { background: rgba(255,255,255,0.28); transform: translateY(-4px); }
  .line-feature-card h4 { font-size: 16px; font-weight: 700; margin: 12px 0 4px; }
  .line-feature-card p { font-size: 13px; opacity: 0.85; margin: 0; }

  .line-phone {
    background: var(--color-primary);
    padding: 40px 24px;
  }
  .phone-mockup {
    width: 300px; height: 620px; background: #44403C;
    border-radius: 48px; padding: 12px;
    box-shadow: 0 60px 120px -30px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08);
    position: relative; z-index: 1;
  }
  .phone-screen {
    width: 100%; height: 100%; background: var(--color-bg-warm);
    border-radius: 38px; overflow: hidden;
  }
  .phone-screen img { width: 100%; height: 100%; object-fit: cover; object-position: top; }

  /* ===== COMPANY ===== */
  .company-section {
    background: var(--color-bg-warm); padding: 80px 24px; flex-direction: column;
  }
  .company-content { max-width: 800px; margin: 0 auto; text-align: center; }
  .company-logo-img { height: 40px; margin: 0 auto 8px; display: block; }
  .company-tagline { font-size: 15px; color: var(--color-text-secondary); margin: 0 0 48px; }
  .company-title {
    font-size: clamp(28px, 4vw, 40px); font-weight: 800;
    letter-spacing: -0.02em; margin: 0 0 24px;
  }
  .company-desc {
    font-size: 17px; color: var(--color-text-secondary);
    line-height: 1.8; margin: 0 0 48px;
  }
  .company-projects {
    background: #fff; border-radius: 20px; padding: 32px 40px; text-align: left;
    box-shadow: 0 4px 24px rgba(0,0,0,0.04); border: 1px solid var(--color-border-dark);
  }
  .company-projects h4 {
    font-size: 13px; font-weight: 700; color: var(--color-text-muted);
    letter-spacing: 0.05em; margin: 0 0 20px; text-transform: uppercase;
  }
  .project-list {
    list-style: none; display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px 32px; margin: 0; padding: 0;
  }
  .project-item {
    font-size: 15px; color: var(--color-text-dark);
    display: flex; align-items: center; gap: 10px;
  }
  .project-item::before {
    content: ''; width: 6px; height: 6px;
    background: var(--color-primary); border-radius: 50%; flex-shrink: 0;
  }

  /* ===== FINAL CTA ===== */
  .final-cta {
    background: var(--color-primary-bg); text-align: center;
    padding: 80px 24px; flex-direction: column;
  }
  .final-cta-title {
    font-size: clamp(40px, 8vw, 80px); font-weight: 800;
    letter-spacing: -0.04em; line-height: 1.1; margin: 0 0 24px;
  }
  .final-cta-desc {
    font-size: clamp(17px, 2vw, 21px); color: var(--color-text-secondary);
    max-width: 560px; margin: 0 auto 56px; line-height: 1.7;
  }
  .cta-buttons {
    display: flex; gap: 20px; justify-content: center;
    flex-wrap: wrap; margin-bottom: 64px;
  }
  .trust-badges { display: flex; gap: 56px; justify-content: center; flex-wrap: wrap; }
  .trust-badge {
    display: flex; align-items: center; gap: 12px;
    font-size: 15px; color: var(--color-text-secondary);
  }
  .trust-badge svg, .trust-badge .iconify { color: var(--color-primary); }

  /* ===== SOLUTION BLOCK (inside headline) ===== */
  .solution-block {
    margin-top: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .solution-arrow {
    font-size: clamp(32px, 5vw, 52px);
    font-weight: 800;
    color: var(--color-primary);
    margin: 0;
    line-height: 1;
  }
  .solution-logo {
    height: clamp(56px, 10vw, 100px);
  }
  .solution-label {
    font-size: clamp(18px, 2.5vw, 24px);
    font-weight: 700;
    color: var(--color-text-dark);
    margin: 0;
    letter-spacing: -0.01em;
  }

  /* ===== FEATURE PAIR (wrapper) ===== */
  .feature-pair, .line-pair {
    flex-direction: column;
  }
  .feature-pair > .feature-text,
  .feature-pair > .feature-img {
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .line-pair > .line-text,
  .line-pair > .line-phone {
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ===== DESKTOP ===== */
  @media (min-width: 769px) {
    /* PC: ペアをgridで横並び */
    .feature-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .feature-pair > .feature-text,
    .feature-pair > .feature-img {
      min-height: 100vh; min-height: 100dvh;
    }

    .line-pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .line-pair > .line-text,
    .line-pair > .line-phone {
      min-height: 100vh; min-height: 100dvh;
    }
  }

  /* ===== MOBILE ===== */
  @media (max-width: 768px) {
    /* モバイル: ペアを縦並びにしてスナップ無効（ペア内スクロール） */
    .feature-pair, .line-pair {
      scroll-snap-align: none;
      min-height: auto;
    }
    .feature-pair > .feature-text,
    .feature-pair > .feature-img,
    .line-pair > .line-text,
    .line-pair > .line-phone {
      min-height: 100vh; min-height: 100dvh;
      scroll-snap-align: start;
    }

    /* ヒーロー */
    .hero { padding: 80px 20px 60px; }
    .hero-logo-img { height: 80px; margin-bottom: 24px; }
    .hero-title { margin: 0 0 16px; }
    .hero-subtitle { margin: 0 auto 32px; font-size: 15px; }
    .hero-cta { padding: 14px 32px; font-size: 15px; }

    /* Feature */
    .feature-text {
      padding: 80px 24px 40px;
    }
    .feature-visual-eyebrow { margin: 0 0 12px; }
    .feature-visual-title { font-size: 28px; margin: 0 0 16px; }
    .feature-visual-desc { font-size: 15px; margin: 0 0 24px; line-height: 1.7; }
    .feature-list { gap: 12px; }
    .feature-list li { font-size: 14px; gap: 10px; }

    .feature-img { padding: 40px 24px; }
    .screen-mockup { max-width: 320px; border-radius: 16px; }

    /* LINE */
    .line-text { padding: 80px 24px 40px; }
    .line-text .headline-title { font-size: 28px; }
    .line-text .headline-desc { font-size: 15px; }
    .line-text-inner .headline-desc { margin-bottom: 24px; }
    .line-features { grid-template-columns: 1fr 1fr; gap: 10px; }
    .line-feature-card { padding: 16px; border-radius: 12px; }
    .line-feature-card h4 { font-size: 14px; margin: 8px 0 2px; }
    .line-feature-card p { font-size: 12px; }
    .line-feature-card svg { width: 22px; height: 22px; }

    .line-phone { padding: 40px 24px; }
    .phone-mockup { width: 240px; height: 500px; border-radius: 40px; padding: 10px; }
    .phone-screen { border-radius: 32px; }

    /* Company */
    .company-section { padding: 80px 20px 40px; }
    .company-tagline { margin: 0 0 24px; font-size: 13px; }
    .company-title { font-size: 24px; margin: 0 0 16px; }
    .company-desc { font-size: 14px; margin: 0 0 24px; line-height: 1.7; }
    .company-projects { padding: 20px; border-radius: 16px; }
    .company-projects h4 { font-size: 12px; margin: 0 0 12px; }
    .project-list { grid-template-columns: 1fr; gap: 8px; }
    .project-item { font-size: 13px; }

    /* Final CTA */
    .final-cta { padding: 60px 20px; }
    .final-cta-title { margin: 0 0 16px; }
    .final-cta-desc { font-size: 14px; margin: 0 auto 32px; }
    .cta-buttons { margin-bottom: 32px; }
    .trust-badges { flex-direction: column; gap: 16px; align-items: center; }
    .trust-badge { font-size: 13px; }

    /* Header */
    .lp-header { padding: 12px 16px; }
    .lp-header-logo { height: 28px; }
    .lp-header-login { padding: 6px 16px; font-size: 13px; min-height: 36px; }
  }
`

export default LandingPage
