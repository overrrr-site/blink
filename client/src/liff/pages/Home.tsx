import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format, differenceInDays, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { scanQRCode, isInLine } from '../utils/liff';

interface OwnerData {
  id: number;
  name: string;
  dogs: Array<{
    id: number;
    name: string;
    photo_url: string;
  }>;
  nextReservation: {
    id: number;
    reservation_date: string;
    reservation_time: string;
    dog_name: string;
    dog_photo: string;
  } | null;
}

// メニューカードコンポーネント
function MenuCard({
  onClick,
  icon,
  iconBgColor,
  iconColor,
  title,
  description,
  badge,
  children,
}: {
  onClick: () => void;
  icon: string;
  iconBgColor: string;
  iconColor: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-card p-4 rounded-3xl border border-border shadow-sm flex flex-col items-start gap-2 relative 
                 active:scale-[0.98] active:bg-muted/50 transition-all duration-150 min-h-[140px]
                 hover:border-primary/30 hover:shadow-md"
      aria-label={title}
    >
      {badge}
      <div className={`size-12 rounded-2xl ${iconBgColor} flex items-center justify-center ${iconColor} mb-1`}>
        <iconify-icon icon={icon} width="28" height="28"></iconify-icon>
      </div>
      <div className="flex-1 w-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">{title}</h3>
          <iconify-icon icon="solar:alt-arrow-right-linear" width="20" height="20" class="text-muted-foreground"></iconify-icon>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight text-left">
          {description}
        </p>
        {children}
      </div>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [data, setData] = useState<OwnerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const fetchData = async () => {
    try {
      const response = await liffClient.get('/me');
      setData(response.data);
    } catch (error) {
      console.error('Error fetching owner data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleCheckIn = async () => {
    if (!data?.nextReservation) {
      alert('予約が見つかりません');
      return;
    }

    // 予約日が過去でないことを確認
    const reservationDate = new Date(data.nextReservation.reservation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);
    
    if (reservationDate < today) {
      alert('この予約は過去の予約です');
      return;
    }

    setCheckingIn(true);
    try {
      let qrCode: string;

      if (isInLine()) {
        // LINEアプリ内: QRコードスキャン
        try {
          qrCode = await scanQRCode();
        } catch (error: any) {
          if (error.message?.includes('QRコードスキャンはLINEアプリ内')) {
            alert('QRコードスキャンはLINEアプリ内でのみ利用可能です');
          } else {
            alert('QRコードのスキャンに失敗しました: ' + (error.message || '不明なエラー'));
          }
          return;
        }
      } else {
        // 外部ブラウザ: 手動入力
        const input = prompt('店舗から提供されたQRコードを入力してください:');
        if (!input) {
          return;
        }
        qrCode = input.trim();
      }

      // チェックインAPIを呼び出し
      await liffClient.post('/check-in', {
        qrCode,
        reservationId: data.nextReservation.id,
      });

      alert('チェックインが完了しました！');
      fetchData();
    } catch (error: any) {
      console.error('Check-in error:', error);
      alert(error.response?.data?.error || 'チェックインに失敗しました');
    } finally {
      setCheckingIn(false);
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
          onClick={handleRefresh}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          再試行
        </button>
      </div>
    );
  }

  const nextReservation = data.nextReservation;
  const daysUntil = nextReservation
    ? differenceInDays(new Date(nextReservation.reservation_date), new Date())
    : null;

  return (
    <div className="px-5 pt-6 pb-28 space-y-6">
      {/* プルダウンリフレッシュのヒント */}
      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="text-primary animate-spin mr-2"></iconify-icon>
          <span className="text-sm text-muted-foreground">更新中...</span>
        </div>
      )}

      {/* 次回登園情報カード */}
      {nextReservation ? (
        <div className="space-y-3">
          <section 
            className="bg-gradient-to-r from-primary/10 to-accent/30 rounded-3xl p-5 border border-primary/20 
                       active:scale-[0.99] transition-transform cursor-pointer"
            onClick={() => navigate('/home/reservations')}
            role="button"
            aria-label="次回登園予定を確認"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold font-heading flex items-center gap-2">
                <iconify-icon icon="solar:calendar-check-bold" width="20" height="20" class="text-primary"></iconify-icon>
                次回登園予定
              </h2>
              {daysUntil !== null && daysUntil >= 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground px-2.5 py-1 rounded-full font-bold animate-pulse">
                  {daysUntil === 0 ? '本日' : daysUntil === 1 ? '明日' : `あと${daysUntil}日`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {data.dogs.length > 0 ? (
                  data.dogs.slice(0, 2).map((dog) => (
                    <img
                      key={dog.id}
                      src={dog.photo_url || '/placeholder-dog.png'}
                      alt={dog.name}
                      className="size-12 rounded-full border-3 border-white object-cover shadow-md"
                    />
                  ))
                ) : (
                  <div className="size-12 rounded-full border-3 border-white bg-primary/10 flex items-center justify-center">
                    <iconify-icon icon="solar:paw-print-bold" width="24" height="24" class="text-primary"></iconify-icon>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">
                  {format(new Date(nextReservation.reservation_date), 'M月d日 (E)', { locale: ja })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextReservation.dog_name} {nextReservation.reservation_time?.slice(0, 5)}
                </p>
              </div>
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <iconify-icon icon="solar:arrow-right-linear" width="20" height="20"></iconify-icon>
              </div>
            </div>
          </section>

          {/* 登園チェックインボタン（今日の予約の場合のみ表示） */}
          {isToday(new Date(nextReservation.reservation_date)) && (
            <button
              onClick={handleCheckIn}
              disabled={checkingIn}
              className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold
                         disabled:opacity-50 disabled:cursor-not-allowed
                         active:scale-95 transition-transform min-h-[56px] shadow-lg
                         flex items-center justify-center gap-2"
            >
              {checkingIn ? (
                <>
                  <iconify-icon icon="solar:spinner-bold" class="size-5 animate-spin"></iconify-icon>
                  チェックイン中...
                </>
              ) : (
                <>
                  <iconify-icon icon="solar:qr-code-bold" class="size-5"></iconify-icon>
                  登園する（QRコードスキャン）
                </>
              )}
            </button>
          )}
        </div>
      ) : (
        <section className="bg-muted/30 rounded-3xl p-5 border border-border text-center">
          <iconify-icon icon="solar:calendar-add-bold" width="48" height="48" class="text-muted-foreground mx-auto mb-2"></iconify-icon>
          <p className="text-sm text-muted-foreground mb-3">次回の予約はありません</p>
          <button
            onClick={() => navigate('/home/reservations/new')}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold 
                       active:scale-95 transition-transform"
          >
            予約する
          </button>
        </section>
      )}

      {/* メニューカード */}
      <div className="grid grid-cols-2 gap-4">
        <MenuCard
          onClick={() => navigate('/home/reservations')}
          icon="solar:calendar-bold"
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
          title="予約"
          description="空き状況確認・予約変更"
        />

        <MenuCard
          onClick={() => navigate('/home/journals')}
          icon="solar:notebook-bold"
          iconBgColor="bg-chart-3/10"
          iconColor="text-chart-3"
          title="日誌"
          description="登園日誌・写真を確認"
        />

        <MenuCard
          onClick={() => navigate('/home/mypage')}
          icon="solar:user-bold"
          iconBgColor="bg-chart-2/10"
          iconColor="text-chart-2"
          title="マイページ"
          description="飼い主・犬情報の確認"
        >
          {data.dogs.length > 0 && (
            <div className="flex -space-x-2 mt-2">
              {data.dogs.slice(0, 3).map((dog) => (
                <img
                  key={dog.id}
                  src={dog.photo_url || '/placeholder-dog.png'}
                  alt={dog.name}
                  className="size-6 rounded-full border-2 border-white object-cover"
                />
              ))}
              {data.dogs.length > 3 && (
                <div className="size-6 rounded-full border-2 border-white bg-muted flex items-center justify-center">
                  <span className="text-[8px] font-bold text-muted-foreground">+{data.dogs.length - 3}</span>
                </div>
              )}
            </div>
          )}
        </MenuCard>

        <MenuCard
          onClick={() => alert('お知らせ機能は準備中です')}
          icon="solar:bell-bold"
          iconBgColor="bg-accent/30"
          iconColor="text-accent-foreground"
          title="お知らせ"
          description="店舗からのお知らせ"
          badge={
            <span className="absolute top-4 right-4 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
              準備中
            </span>
          }
        />
      </div>

      {/* クイックアクション */}
      <section className="bg-card rounded-3xl p-4 border border-border shadow-sm">
        <h2 className="text-sm font-bold text-muted-foreground mb-3">クイックアクション</h2>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/home/reservations/new')}
            className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold 
                       flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label="新規予約"
          >
            <iconify-icon icon="solar:add-circle-bold" width="20" height="20"></iconify-icon>
            新規予約
          </button>
          <button
            onClick={() => navigate('/home/journals')}
            className="flex-1 bg-muted text-foreground py-3 rounded-xl text-sm font-bold 
                       flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label="日誌を見る"
          >
            <iconify-icon icon="solar:notebook-bold" width="20" height="20"></iconify-icon>
            日誌を見る
          </button>
        </div>
      </section>
    </div>
  );
}
