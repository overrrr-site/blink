import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'

const CTASection = () => {
  return (
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
  )
}

export default CTASection
