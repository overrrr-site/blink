export const lpStyles = `
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
      display: contents;
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
