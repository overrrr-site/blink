import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom';
import { useLiffAuthStore } from '../store/authStore';
import { useToast } from '../../components/Toast'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import ConfirmDialog from '../../components/ConfirmDialog'
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getAvatarUrl } from '../../utils/image';
import useSWR from 'swr';
import { liffFetcher } from '../lib/swr';

interface OwnerData {
  id: number;
  name: string;
  name_kana: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  dogs: Array<{
    id: number;
    name: string;
    breed: string;
    photo_url: string;
    gender: string;
    spayed_neutered: boolean;
    birth_date: string;
    reservation_count: number;
    mixed_vaccine_date: string | null;
    rabies_vaccine_date: string | null;
  }>;
  contracts: Array<{
    id: number;
    course_name: string;
    contract_type: string;
    start_date: string;
    end_date: string;
    price: number | null;
    total_sessions: number | null;
    remaining_sessions: number | null;
    calculated_remaining: number | null;
    monthly_sessions: number | null;
  }>;
}

type VaccineBadgeProps = {
  label: string;
  expiryDate: string;
};

function VaccineBadge({ label, expiryDate }: VaccineBadgeProps) {
  const isExpired = new Date(expiryDate) < new Date();
  const badgeClass = isExpired
    ? 'bg-destructive/10 text-destructive'
    : 'bg-chart-2/10 text-chart-2';

  return (
    <span className={`text-[10px] px-2 py-1 rounded-lg font-medium ${badgeClass}`}>
      {isExpired && <Icon icon="solar:danger-triangle-bold" width="12" height="12" className="mr-1 inline-block align-middle" />}
      {label} {format(new Date(expiryDate), 'yyyy/M/d', { locale: ja })}まで
      {isExpired && ' (期限切れ)'}
    </span>
  );
}

type MenuButtonProps = {
  onClick: () => void;
  icon: string;
  label: string;
  badge?: string;
  destructive?: boolean;
  isLast?: boolean;
};

function MenuButton({ onClick, icon, label, badge, destructive, isLast }: MenuButtonProps) {
  const baseClass = destructive
    ? 'hover:bg-destructive/5 active:bg-destructive/10'
    : 'hover:bg-muted/50 active:bg-muted';
  const borderClass = isLast ? '' : 'border-b border-border';
  const textClass = destructive ? 'text-destructive' : '';
  const iconClass = destructive ? 'text-destructive' : 'text-muted-foreground';

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between p-4 ${baseClass} active:scale-[0.98] transition-all ${borderClass} min-h-[56px]`}
      aria-label={label}
    >
      <div className="flex items-center gap-3">
        <Icon icon={icon} width="20" height="20" className={iconClass} />
        <span className={`text-sm font-medium ${textClass}`}>{label}</span>
        {badge && (
          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{badge}</span>
        )}
      </div>
      <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
    </button>
  );
}

export default function MyPage() {
  const navigate = useNavigate();
  const { clearAuth } = useLiffAuthStore();
  const selectedBusinessType = useLiffAuthStore((s) => s.selectedBusinessType || s.owner?.primaryBusinessType || 'daycare');
  const { showToast } = useToast()
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog()
  const { data, isLoading: loading } = useSWR<OwnerData>('/me', liffFetcher, {
    revalidateOnFocus: false,
  });

  const handleLogout = async () => {
    const ok = await confirm({ title: '確認', message: 'ログアウトしますか？', confirmLabel: 'ログアウト', cancelLabel: 'キャンセル', variant: 'destructive' })
    if (ok) {
      clearAuth();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold"
          width="48"
          height="48"
          className="text-primary animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-5 pt-6 text-center">
        <Icon icon="solar:cloud-cross-bold" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">データの取得に失敗しました</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          再試行
        </button>
      </div>
    );
  }

  const currentContract = data.contracts[0] || null;
  const shouldShowContractInfo = selectedBusinessType === 'daycare';

  return (
    <div className="px-5 pt-6 pb-28 space-y-6">
      <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted active:scale-95 transition-all"
          aria-label="戻る"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">マイページ</h1>
      </div>

      {/* 飼い主プロフィール */}
      <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="size-16 rounded-full border-3 border-primary/20 p-0.5 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Icon icon="solar:user-bold" width="32" height="32" className="text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold font-heading">{data.name}</h2>
            <p className="text-xs text-muted-foreground">
              会員番号: M-{format(new Date(data.created_at), 'yyyy')}-{String(data.id).padStart(4, '0')}
            </p>
            <p className="text-xs text-muted-foreground">
              ご登録日: {format(new Date(data.created_at), 'yyyy年M月d日', { locale: ja })}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-border">
          {data.phone && (
            <a 
              href={`tel:${data.phone}`}
              className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors min-h-[44px]"
              aria-label={`電話: ${data.phone}`}
            >
              <Icon icon="solar:phone-bold" width="20" height="20" className="text-primary" />
              <span className="text-sm">{data.phone}</span>
            </a>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors min-h-[44px]"
              aria-label={`メール: ${data.email}`}
            >
              <Icon icon="solar:letter-bold" width="20" height="20" className="text-primary" />
              <span className="text-sm truncate">{data.email}</span>
            </a>
          )}
          {data.address && (
            <div className="flex items-start gap-3 p-2 -m-2 min-h-[44px]">
              <Icon icon="solar:home-2-bold" width="20" height="20" className="text-muted-foreground mt-0.5" />
              <span className="text-sm">{data.address}</span>
            </div>
          )}
        </div>
      </section>

      {/* 登録犬一覧 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold font-heading flex items-center gap-2">
            <Icon icon="solar:paw-print-bold" width="20" height="20" className="text-primary" />
            登録ワンちゃん ({data.dogs.length}頭)
          </h2>
        </div>

        {data.dogs.length > 0 ? (
          <div className="space-y-3">
            {data.dogs.map((dog) => (
              <div 
                key={dog.id} 
                className="bg-card rounded-2xl p-4 border border-border shadow-sm active:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="size-14 rounded-full overflow-hidden border-2 border-primary shrink-0">
                    {dog.photo_url ? (
                      <img src={getAvatarUrl(dog.photo_url)} alt={dog.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold text-base">{dog.name}</h3>
                      <span className="text-[10px] bg-chart-5/10 text-chart-5 px-1.5 py-0.5 rounded font-bold">
                        {dog.gender === 'メス' ? '♀' : '♂'} {dog.spayed_neutered ? '避妊済' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dog.breed}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs flex items-center gap-1">
                        <Icon icon="solar:calendar-bold" width="14" height="14" className="text-muted-foreground" />
                        <span className="text-muted-foreground">登園:</span>
                        <span className="font-bold text-primary">{dog.reservation_count || 0}回</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* ワクチン情報 */}
                {(dog.mixed_vaccine_date || dog.rabies_vaccine_date) && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon icon="solar:shield-check-bold" width="16" height="16" className="text-chart-2" />
                      <span className="text-[10px] font-bold text-muted-foreground">ワクチン接種状況</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dog.rabies_vaccine_date && (
                        <VaccineBadge label="狂犬病" expiryDate={dog.rabies_vaccine_date} />
                      )}
                      {dog.mixed_vaccine_date && (
                        <VaccineBadge label="混合" expiryDate={dog.mixed_vaccine_date} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 rounded-2xl p-6 text-center">
            <Icon icon="solar:paw-print-linear" width="48" height="48" className="text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">登録されているワンちゃんがいません</p>
          </div>
        )}
      </section>

      {/* 契約情報（幼稚園のみ表示） */}
      {shouldShowContractInfo && currentContract && (
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold font-heading flex items-center gap-2">
              <Icon icon="solar:document-bold" width="20" height="20" className="text-chart-4" />
              契約情報
            </h2>
          </div>

          <div className="space-y-4">
            <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-accent-foreground">現在のプラン</span>
                <span className="text-xs bg-chart-2/10 text-chart-2 px-2 py-0.5 rounded-full font-bold">
                  {currentContract.contract_type}
                </span>
              </div>
              <p className="text-base font-bold">{currentContract.course_name}</p>
              
              {/* 残数表示（チケット制） */}
              {currentContract.contract_type === 'チケット制' && (
                <div className="mt-3 pt-3 border-t border-accent/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">残り回数</span>
                    {(() => {
                      const remaining = currentContract.calculated_remaining ?? currentContract.remaining_sessions ?? 0;
                      return (
                        <span className={`text-lg font-bold ${
                          remaining === 0 
                            ? 'text-destructive' 
                            : remaining <= 3 
                            ? 'text-warning' 
                            : 'text-primary'
                        }`}>
                          {remaining} 回
                          {currentContract.total_sessions && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              / {currentContract.total_sessions}回
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              {/* 月間利用可能回数（月謝制） */}
              {currentContract.contract_type === '月謝制' && currentContract.monthly_sessions && (
                <div className="mt-3 pt-3 border-t border-accent/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">月間利用可能回数</span>
                    <span className="text-base font-bold text-primary">
                      {currentContract.monthly_sessions} 回
                    </span>
                  </div>
                </div>
              )}

              {/* 料金表示 */}
              {currentContract.price && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-accent/30">
                  <span className="text-xs text-muted-foreground">
                    {currentContract.contract_type === '月謝制' ? '月額料金' : '料金'}
                  </span>
                  <span className="text-base font-bold">
                    ¥{Math.floor(currentContract.price).toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground">（税込）</span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* メニュー */}
      <section className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <h3 className="sr-only">メニュー</h3>
        <MenuButton onClick={() => showToast('通知設定機能は準備中です', 'info')} icon="solar:bell-bold" label="通知設定" badge="準備中" />
        <MenuButton onClick={() => showToast('よくある質問ページは準備中です', 'info')} icon="solar:question-circle-bold" label="よくある質問" badge="準備中" />
        <MenuButton onClick={() => showToast('お問い合わせ機能は準備中です', 'info')} icon="solar:chat-round-dots-bold" label="お問い合わせ" badge="準備中" />
        <MenuButton onClick={() => navigate('/privacy')} icon="solar:shield-check-bold" label="プライバシーポリシー" />
        <MenuButton onClick={() => navigate('/terms')} icon="solar:document-text-bold" label="利用規約" />
        <MenuButton onClick={handleLogout} icon="solar:logout-2-bold" label="ログアウト" destructive isLast />
      </section>

      {/* バージョン情報 */}
      <p className="text-center text-[10px] text-muted-foreground py-2">
        Blink アプリ v1.0.0
      </p>
    </div>
  );
}
