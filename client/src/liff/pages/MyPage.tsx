import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiffAuthStore } from '../store/authStore';
import liffClient from '../api/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

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
    monthly_fee: number;
  }>;
}

export default function MyPage() {
  const navigate = useNavigate();
  const { owner, clearAuth } = useLiffAuthStore();
  const [data, setData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await liffClient.get('/me');
        setData(response.data);
      } catch (error) {
        console.error('Error fetching owner data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      clearAuth();
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <iconify-icon
          icon="solar:spinner-bold"
          width="48"
          height="48"
          class="text-primary animate-spin"
        ></iconify-icon>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-5 pt-6 text-center">
        <iconify-icon icon="solar:cloud-cross-bold" width="64" height="64" class="text-muted-foreground mx-auto mb-4"></iconify-icon>
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

  return (
    <div className="px-5 pt-6 pb-28 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">マイページ</h1>
      </div>

      {/* 飼い主プロフィール */}
      <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="size-16 rounded-full border-3 border-primary/20 p-0.5 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <iconify-icon icon="solar:user-bold" width="32" height="32" class="text-primary"></iconify-icon>
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
              <iconify-icon icon="solar:phone-bold" width="20" height="20" class="text-primary"></iconify-icon>
              <span className="text-sm">{data.phone}</span>
            </a>
          )}
          {data.email && (
            <a
              href={`mailto:${data.email}`}
              className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors min-h-[44px]"
              aria-label={`メール: ${data.email}`}
            >
              <iconify-icon icon="solar:letter-bold" width="20" height="20" class="text-primary"></iconify-icon>
              <span className="text-sm truncate">{data.email}</span>
            </a>
          )}
          {data.address && (
            <div className="flex items-start gap-3 p-2 -m-2 min-h-[44px]">
              <iconify-icon icon="solar:home-2-bold" width="20" height="20" class="text-muted-foreground mt-0.5"></iconify-icon>
              <span className="text-sm">{data.address}</span>
            </div>
          )}
        </div>
      </section>

      {/* 登録犬一覧 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold font-heading flex items-center gap-2">
            <iconify-icon icon="solar:paw-print-bold" width="20" height="20" class="text-primary"></iconify-icon>
            登録犬 ({data.dogs.length}頭)
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
                      <img src={dog.photo_url} alt={dog.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                        <iconify-icon icon="solar:paw-print-bold" width="24" height="24" class="text-primary"></iconify-icon>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <h3 className="font-bold text-base">{dog.name}</h3>
                      <span className="text-[10px] bg-chart-5/10 text-chart-5 px-1.5 py-0.5 rounded font-semibold">
                        {dog.gender === 'メス' ? '♀' : '♂'} {dog.spayed_neutered ? '避妊済' : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{dog.breed}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs flex items-center gap-1">
                        <iconify-icon icon="solar:calendar-bold" width="14" height="14" class="text-muted-foreground"></iconify-icon>
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
                      <iconify-icon icon="solar:shield-check-bold" width="16" height="16" class="text-chart-2"></iconify-icon>
                      <span className="text-[10px] font-semibold text-muted-foreground">ワクチン接種状況</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {dog.rabies_vaccine_date && (() => {
                        const isExpired = new Date(dog.rabies_vaccine_date) < new Date();
                        return (
                          <span className={`text-[10px] px-2 py-1 rounded-lg font-medium ${
                            isExpired 
                              ? 'bg-destructive/10 text-destructive' 
                              : 'bg-chart-2/10 text-chart-2'
                          }`}>
                            {isExpired && <iconify-icon icon="solar:danger-triangle-bold" width="12" height="12" class="mr-1 inline-block align-middle"></iconify-icon>}
                            狂犬病 {format(new Date(dog.rabies_vaccine_date), 'yyyy/M/d', { locale: ja })}まで
                            {isExpired && ' (期限切れ)'}
                          </span>
                        );
                      })()}
                      {dog.mixed_vaccine_date && (() => {
                        const isExpired = new Date(dog.mixed_vaccine_date) < new Date();
                        return (
                          <span className={`text-[10px] px-2 py-1 rounded-lg font-medium ${
                            isExpired 
                              ? 'bg-destructive/10 text-destructive' 
                              : 'bg-chart-2/10 text-chart-2'
                          }`}>
                            {isExpired && <iconify-icon icon="solar:danger-triangle-bold" width="12" height="12" class="mr-1 inline-block align-middle"></iconify-icon>}
                            混合 {format(new Date(dog.mixed_vaccine_date), 'yyyy/M/d', { locale: ja })}まで
                            {isExpired && ' (期限切れ)'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-muted/30 rounded-2xl p-6 text-center">
            <iconify-icon icon="solar:paw-print-linear" width="48" height="48" class="text-muted-foreground mx-auto mb-2"></iconify-icon>
            <p className="text-sm text-muted-foreground">登録されている犬がありません</p>
          </div>
        )}
      </section>

      {/* 契約情報 */}
      {currentContract && (
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold font-heading flex items-center gap-2">
              <iconify-icon icon="solar:document-bold" width="20" height="20" class="text-chart-4"></iconify-icon>
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
              
              {/* 残数表示 */}
              {currentContract.contract_type === 'チケット制' && currentContract.remaining_sessions !== null && (
                <div className="mt-3 pt-3 border-t border-accent/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">残り回数</span>
                    <span className={`text-lg font-bold ${
                      currentContract.remaining_sessions === 0 
                        ? 'text-destructive' 
                        : currentContract.remaining_sessions <= 3 
                        ? 'text-warning' 
                        : 'text-primary'
                    }`}>
                      {currentContract.remaining_sessions} 回
                    </span>
                  </div>
                </div>
              )}
              
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

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-accent/30">
                <span className="text-xs text-muted-foreground">月額料金</span>
                <span className="text-base font-bold">
                  ¥{currentContract.monthly_fee?.toLocaleString()}
                  <span className="text-xs font-normal text-muted-foreground">（税込）</span>
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* メニュー */}
      <section className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <h3 className="sr-only">メニュー</h3>
        <button 
          onClick={() => alert('通知設定機能は準備中です')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border min-h-[56px]"
          aria-label="通知設定"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:bell-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <span className="text-sm font-medium">通知設定</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">準備中</span>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
        <button 
          onClick={() => alert('よくある質問ページは準備中です')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border min-h-[56px]"
          aria-label="よくある質問"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:question-circle-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <span className="text-sm font-medium">よくある質問</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">準備中</span>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
        <button 
          onClick={() => alert('お問い合わせ機能は準備中です')}
          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted transition-colors border-b border-border min-h-[56px]"
          aria-label="お問い合わせ"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:chat-round-dots-bold" width="20" height="20" class="text-muted-foreground"></iconify-icon>
            <span className="text-sm font-medium">お問い合わせ</span>
            <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">準備中</span>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 hover:bg-destructive/5 active:bg-destructive/10 transition-colors min-h-[56px]"
          aria-label="ログアウト"
        >
          <div className="flex items-center gap-3">
            <iconify-icon icon="solar:logout-2-bold" width="20" height="20" class="text-destructive"></iconify-icon>
            <span className="text-sm font-medium text-destructive">ログアウト</span>
          </div>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </button>
      </section>

      {/* バージョン情報 */}
      <p className="text-center text-[10px] text-muted-foreground py-2">
        Blink アプリ v1.0.0
      </p>
    </div>
  );
}
