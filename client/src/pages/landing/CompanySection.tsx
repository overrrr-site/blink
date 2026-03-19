const CompanySection = () => {
  return (
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
  )
}

export default CompanySection
