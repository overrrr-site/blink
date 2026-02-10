import { useEffect, useState, memo } from 'react';
import axios from 'axios';
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format, differenceInDays, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { scanQRCode } from '../utils/liff';
import { useLiffAuthStore } from '../store/authStore';
import { getAvatarUrl } from '../../utils/image';
import { getAxiosErrorMessage } from '../../utils/error';
import { getRecordLabel } from '../../utils/businessTypeColors';
import useSWR from 'swr';
import { liffFetcher } from '../lib/swr';
import { LazyImage } from '../../components/LazyImage';
import type { RecordType } from '../../types/record';

interface OwnerData {
  id: number;
  name: string;
  store_id: number;
  store_name: string;
  store_address: string;
  line_id: string;
  primary_business_type?: RecordType;
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
    status: string;
    checked_in_at: string | null;
    checked_out_at: string | null;
    has_pre_visit_input: boolean;
  } | null;
}

// メニューカードコンポーネント
const MenuCard = memo(function MenuCard({
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
        <Icon icon={icon} width="28" height="28" />
      </div>
      <div className="flex-1 w-full">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base">{title}</h3>
          <Icon icon="solar:alt-arrow-right-linear" width="20" height="20" className="text-muted-foreground" />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight text-left">
          {description}
        </p>
        {children}
      </div>
    </button>
  );
});

export default function Home() {
  const navigate = useNavigate();
  const { owner, setAuth, token } = useLiffAuthStore();
  const { data, error, isLoading, mutate } = useSWR<OwnerData>('/me', liffFetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalMode, setQrModalMode] = useState<'checkin' | 'checkout'>('checkin');
  const [qrInput, setQrInput] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);

  const recordLabel = getRecordLabel(data?.primary_business_type);

  useEffect(() => {
    if (data && token) {
      setAuth(token, {
        id: data.id,
        name: data.name,
        storeId: data.store_id,
        storeName: data.store_name || '',
        storeAddress: data.store_address || '',
        lineUserId: data.line_id || owner?.lineUserId || '',
        primaryBusinessType: data.primary_business_type,
      });
    }
  }, [data, owner?.lineUserId, setAuth, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await mutate();
    } finally {
      setRefreshing(false);
    }
  };

  function getQrActionErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { code?: string; error?: string } | undefined;
      if (data?.code === 'QR_STORE_MISMATCH') {
        return 'このQRコードは別の店舗のものです。店舗掲示のQRコードをご利用ください。';
      }
      if (data?.code === 'QR_INVALID') {
        return 'QRコードが無効または期限切れです。店舗で再発行されたQRコードをお試しください。';
      }
      return data?.error || fallback;
    }
    return getAxiosErrorMessage(error, fallback);
  }

  function enrichQrErrorMessage(message: string): string {
    if (message.includes('カメラへのアクセスが許可されていません')) {
      return 'カメラへのアクセスが許可されていません。\n\n【iPhoneの場合】\n設定アプリ → LINE → カメラをオンにしてください\n\n【Androidの場合】\n設定 → アプリ → LINE → 権限 → カメラを許可';
    }
    if (message.includes('LINEアプリ内でのみ')) {
      return 'QRコードスキャンはLINEアプリ内でのみ利用可能です。\n\nLINEアプリのトーク画面からこのページを開いてください。';
    }
    return message;
  }

  function showQrFallbackModal(mode: 'checkin' | 'checkout', scanError: Error): void {
    const errorMessage = scanError.message || 'QRコードスキャンに失敗しました';
    setQrModalMode(mode);
    setQrError(enrichQrErrorMessage(errorMessage));
    setQrInput('');
    setShowQrModal(true);
  }

  function closeQrModal(): void {
    setShowQrModal(false);
    setQrError(null);
    setQrInput('');
  }

  const processQrAction = async (
    qrCode: string,
    mode: 'checkin' | 'checkout',
  ) => {
    if (!data?.nextReservation) return;
    const setLoading = mode === 'checkin' ? setCheckingIn : setCheckingOut;
    const endpoint = mode === 'checkin' ? '/check-in' : '/check-out';
    const successMsg = mode === 'checkin'
      ? 'チェックインが完了しました！'
      : 'チェックアウトが完了しました！お疲れさまでした。';
    const errorMsg = mode === 'checkin'
      ? 'チェックインに失敗しました'
      : 'チェックアウトに失敗しました';

    setLoading(true);
    try {
      await liffClient.post(endpoint, {
        qrCode,
        reservationId: data.nextReservation.id,
      });
      closeQrModal();
      alert(successMsg);
      mutate();
    } catch (error) {
      alert(getQrActionErrorMessage(error, errorMsg));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!data?.nextReservation) {
      alert('予約が見つかりません');
      return;
    }

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
      const qrCode = await scanQRCode();
      await processQrAction(qrCode, 'checkin');
    } catch (scanError) {
      setCheckingIn(false);
      showQrFallbackModal('checkin', scanError as Error);
    }
  };

  const handleCheckOut = async () => {
    if (!data?.nextReservation) {
      alert('予約が見つかりません');
      return;
    }

    if (data.nextReservation.status !== '登園済') {
      alert('まだ登園していません');
      return;
    }

    if (data.nextReservation.checked_out_at) {
      alert('既に降園済みです');
      return;
    }

    setCheckingOut(true);
    try {
      const qrCode = await scanQRCode();
      await processQrAction(qrCode, 'checkout');
    } catch (scanError) {
      setCheckingOut(false);
      showQrFallbackModal('checkout', scanError as Error);
    }
  };

  const handleManualCheckIn = () => {
    if (!qrInput.trim()) {
      alert('QRコードの内容を入力してください');
      return;
    }
    processQrAction(qrInput.trim(), qrModalMode);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold"
          width="48"
          height="48"
          className="text-primary animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-5 pt-6 text-center">
        <Icon icon="solar:cloud-cross-bold" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
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
          <Icon icon="solar:spinner-bold" width="20" height="20" className="text-primary animate-spin mr-2" />
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
                <Icon icon="solar:calendar-check-bold" width="20" height="20" className="text-primary" />
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
                    dog.photo_url ? (
                      <LazyImage
                        key={dog.id}
                        src={getAvatarUrl(dog.photo_url)}
                        alt={dog.name}
                        width={48}
                        height={48}
                        className="size-12 rounded-full border-3 border-white object-cover shadow-md"
                      />
                    ) : (
                      <div
                        key={dog.id}
                        className="size-12 rounded-full border-3 border-white bg-primary/10 flex items-center justify-center shadow-md"
                      >
                        <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-primary" />
                      </div>
                    )
                  ))
                ) : (
                  <div className="size-12 rounded-full border-3 border-white bg-primary/10 flex items-center justify-center">
                    <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-primary" />
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
                <Icon icon="solar:arrow-right-linear" width="20" height="20" />
              </div>
            </div>
          </section>

          {/* 登園前入力ボタン（今日の予約で未登園の場合） */}
          {isToday(new Date(nextReservation.reservation_date)) &&
           nextReservation.status === '予定' && (
            nextReservation.has_pre_visit_input ? (
              // 入力済みの場合（タップで編集可能）
              <button
                onClick={() => navigate(`/home/pre-visit/${nextReservation.id}`)}
                className="w-full bg-chart-2/10 text-chart-2 py-3 rounded-xl font-medium
                           min-h-[48px] flex items-center justify-center gap-2 border border-chart-2/20
                           active:scale-95 transition-transform hover:bg-chart-2/20"
              >
                <Icon icon="solar:check-circle-bold" className="size-5" />
                登園前情報 入力済み
                <Icon icon="solar:pen-linear" className="size-4 ml-1 opacity-60" />
              </button>
            ) : (
              // 未入力の場合
              <button
                onClick={() => navigate(`/home/pre-visit/${nextReservation.id}`)}
                className="w-full bg-chart-3/10 text-chart-3 py-3 rounded-xl font-bold
                           active:scale-95 transition-transform min-h-[48px]
                           flex items-center justify-center gap-2 border border-chart-3/30
                           hover:bg-chart-3/20"
              >
                <Icon icon="solar:clipboard-text-bold" className="size-5" />
                登園前情報を入力する
              </button>
            )
          )}

          {/* 登園/降園ボタン（今日の予約の場合のみ表示） */}
          {isToday(new Date(nextReservation.reservation_date)) && (
            <>
              {/* チェックアウト済みの場合 */}
              {nextReservation.checked_out_at ? (
                <div className="w-full bg-chart-2/10 text-chart-2 py-4 rounded-xl font-bold
                               min-h-[56px] flex items-center justify-center gap-2">
                  <Icon icon="mdi:check-circle" className="size-5" />
                  本日の登園完了
                </div>
              ) : nextReservation.status === '登園済' ? (
                /* 登園済み → 退園ボタン表示 */
                <button
                  onClick={handleCheckOut}
                  disabled={checkingOut}
                  className="w-full bg-chart-5 text-white py-4 rounded-xl font-bold
                             disabled:opacity-50 disabled:cursor-not-allowed
                             active:scale-95 transition-transform min-h-[56px] shadow-lg
                             flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <>
                      <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
                      退園処理中...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:qr-code-bold" className="size-5" />
                      退園する（QRコードスキャン）
                    </>
                  )}
                </button>
              ) : nextReservation.status === '降園済' ? (
                /* 降園済み → 完了表示 */
                <div className="w-full bg-chart-2/10 text-chart-2 py-4 rounded-xl font-bold
                               min-h-[56px] flex items-center justify-center gap-2">
                  <Icon icon="mdi:check-circle" className="size-5" />
                  本日の登園完了
                </div>
              ) : (
                /* 未登園 → 登園ボタン表示 */
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
                      <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
                      チェックイン中...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:qr-code-bold" className="size-5" />
                      登園する（QRコードスキャン）
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <section className="bg-muted/30 rounded-3xl p-5 border border-border text-center">
          <Icon icon="solar:calendar-add-bold" width="48" height="48" className="text-muted-foreground mx-auto mb-2" />
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
          onClick={() => navigate('/home/records')}
          icon="solar:clipboard-text-bold"
          iconBgColor="bg-chart-3/10"
          iconColor="text-chart-3"
          title={recordLabel}
          description={`${recordLabel}・写真を確認`}
        />

        <MenuCard
          onClick={() => navigate('/home/mypage')}
          icon="solar:user-bold"
          iconBgColor="bg-chart-2/10"
          iconColor="text-chart-2"
          title="マイページ"
          description="飼い主・ワンちゃん情報の確認"
        >
          {data.dogs.length > 0 && (
            <div className="flex -space-x-2 mt-2">
              {data.dogs.slice(0, 3).map((dog) => (
                dog.photo_url ? (
                  <LazyImage
                    key={dog.id}
                    src={getAvatarUrl(dog.photo_url)}
                    alt={dog.name}
                    width={24}
                    height={24}
                    className="size-6 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div
                    key={dog.id}
                    className="size-6 rounded-full border-2 border-white bg-primary/10 flex items-center justify-center"
                  >
                    <Icon icon="solar:paw-print-bold" width="12" height="12" className="text-primary" />
                  </div>
                )
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
          onClick={() => navigate('/home/announcements')}
          icon="solar:bell-bold"
          iconBgColor="bg-accent/30"
          iconColor="text-accent-foreground"
          title="お知らせ"
          description="店舗からのお知らせ"
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
            <Icon icon="solar:add-circle-bold" width="20" height="20" />
            新規予約
          </button>
          <button
            onClick={() => navigate('/home/records')}
            className="flex-1 bg-muted text-foreground py-3 rounded-xl text-sm font-bold
                       flex items-center justify-center gap-2 active:scale-95 transition-transform"
            aria-label={`${recordLabel}を見る`}
          >
            <Icon icon="solar:clipboard-text-bold" width="20" height="20" />
            {recordLabel}を見る
          </button>
        </div>
      </section>

      {/* QRコード手動入力モーダル */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div 
            className="bg-card rounded-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold font-heading flex items-center gap-2">
                <Icon icon="solar:qr-code-bold" width="20" height="20" className="text-primary" />
                {qrModalMode === 'checkout' ? '降園QRコード入力' : '登園QRコード入力'}
              </h2>
              <button
                onClick={closeQrModal}
                className="size-10 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-circle-bold" width="24" height="24" className="text-muted-foreground" />
              </button>
            </div>

            {/* コンテンツ */}
            <div className="p-5 space-y-4">
              {/* エラーメッセージ */}
              {qrError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Icon icon="solar:info-circle-bold" width="20" height="20" className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive whitespace-pre-line leading-relaxed">{qrError}</p>
                  </div>
                </div>
              )}

              {/* 説明 */}
              <div className="bg-muted/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  店舗に設置されているQRコードをスキャンできない場合は、スタッフにQRコードの内容をお伝えいただくか、以下に手動で入力してください。
                </p>
              </div>

              {/* 入力フィールド */}
              <div>
                <label className="block text-xs text-muted-foreground mb-2">QRコードの内容</label>
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="スタッフから教えてもらった内容を入力"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  autoFocus
                />
              </div>

              {/* カメラで再試行ボタン */}
              <button
                onClick={() => {
                  setShowQrModal(false);
                  if (qrModalMode === 'checkout') {
                    handleCheckOut();
                  } else {
                    handleCheckIn();
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary text-primary text-sm font-bold hover:bg-primary/5 transition-colors"
              >
                <Icon icon="solar:camera-bold" width="20" height="20" />
                カメラで再試行
              </button>

              {/* 送信ボタン */}
              <button
                onClick={handleManualCheckIn}
                disabled={!qrInput.trim() || checkingIn || checkingOut}
                className={`w-full py-4 rounded-xl text-sm font-bold 
                           disabled:opacity-50 disabled:cursor-not-allowed
                           active:scale-95 transition-transform flex items-center justify-center gap-2
                           ${qrModalMode === 'checkout' 
                             ? 'bg-chart-5 text-white' 
                             : 'bg-primary text-primary-foreground'}`}
              >
                {(checkingIn || checkingOut) ? (
                  <>
                    <Icon icon="solar:spinner-bold" className="size-5 animate-spin" />
                    {qrModalMode === 'checkout' ? 'チェックアウト中...' : 'チェックイン中...'}
                  </>
                ) : (
                  <>
                    <Icon icon="solar:check-circle-bold" width="20" height="20" />
                    {qrModalMode === 'checkout' ? 'この内容でチェックアウト' : 'この内容でチェックイン'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
