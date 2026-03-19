import { Icon } from '../../components/Icon'

const FeatureSection = () => {
  return (
    <>
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
    </>
  )
}

export default FeatureSection
