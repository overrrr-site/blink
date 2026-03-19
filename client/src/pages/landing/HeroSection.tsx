import { Link } from 'react-router-dom'

const HeroSection = () => {
  return (
    <>
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
    </>
  )
}

export default HeroSection
