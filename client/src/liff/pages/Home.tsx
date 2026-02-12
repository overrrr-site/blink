import { useEffect, useState, memo } from 'react';
import axios from 'axios';
import { Icon } from '../../components/Icon'
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast'
import liffClient from '../api/client';
import { format, differenceInDays, isToday } from 'date-fns';
import { ja } from 'date-fns/locale';
import { scanQRCode } from '../utils/liff';
import { useLiffAuthStore } from '../store/authStore';
import { getAvatarUrl } from '../../utils/image';
import { getAxiosErrorMessage } from '../../utils/error';
import {
  getBusinessTypeColors,
  getBusinessTypeIcon,
  getBusinessTypeLabel,
  getDashboardStatusLabels,
  getRecordLabel,
} from '../../domain/businessTypeConfig';
import useSWR from 'swr';
import { liffFetcher } from '../lib/swr';
import { LazyImage } from '../../components/LazyImage';
import type { RecordType } from '../../types/record';
import type { DashboardSummary } from '../types/dashboard';

interface OwnerData {
  id: number;
  name: string;
  store_id: number;
  store_name: string;
  store_address: string;
  line_id: string;
  primary_business_type?: RecordType;
  available_business_types?: RecordType[];
}

const DashboardCard = memo(function DashboardCard({
  onClick,
  icon,
  iconColor,
  iconBg,
  title,
  description,
  actionLabel,
  badge,
}: {
  onClick: () => void
  icon: string
  iconColor: string
  iconBg: string
  title: string
  description: string
  actionLabel: string
  badge?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-card p-4 rounded-3xl border border-border shadow-sm text-left
                 active:scale-[0.99] transition-all hover:border-primary/30"
      aria-label={title}
    >
      <div className="flex items-start gap-3">
        <div className="size-11 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon icon={icon} width="24" height="24" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold font-heading">{title}</h2>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{description}</p>
          <span className="text-xs font-bold text-primary mt-3 inline-flex items-center gap-1">
            {actionLabel}
            <Icon icon="solar:alt-arrow-right-linear" width="14" height="14" />
          </span>
        </div>
      </div>
    </button>
  )
});

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast()
  const { owner, setAuth, token, selectedBusinessType } = useLiffAuthStore();

  const {
    data: ownerData,
    isLoading: ownerLoading,
    mutate: mutateOwner,
  } = useSWR<OwnerData>('/me', liffFetcher, {
    dedupingInterval: 60_000,
    revalidateOnFocus: false,
  });

  const effectiveBusinessType = selectedBusinessType || ownerData?.primary_business_type || 'daycare';
  const summaryKey = `/dashboard/summary?service_type=${effectiveBusinessType}`;

  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR<DashboardSummary>(summaryKey, liffFetcher, {
    dedupingInterval: 20_000,
    revalidateOnFocus: false,
  });

  const [refreshing, setRefreshing] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalMode, setQrModalMode] = useState<'checkin' | 'checkout'>('checkin');
  const [qrInput, setQrInput] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);

  const recordLabel = getRecordLabel(effectiveBusinessType);
  const statusLabels = getDashboardStatusLabels(effectiveBusinessType);
  const preVisitLabel = `${statusLabels.checkIn}前入力`;
  const businessColors = getBusinessTypeColors(effectiveBusinessType);
  const businessTypeLabel = getBusinessTypeLabel(effectiveBusinessType);
  const businessTypeIcon = getBusinessTypeIcon(effectiveBusinessType);

  useEffect(() => {
    if (ownerData && token) {
      setAuth(token, {
        id: ownerData.id,
        name: ownerData.name,
        storeId: ownerData.store_id,
        storeName: ownerData.store_name || '',
        storeAddress: ownerData.store_address || '',
        lineUserId: ownerData.line_id || owner?.lineUserId || '',
        primaryBusinessType: ownerData.primary_business_type,
        availableBusinessTypes: ownerData.available_business_types || [],
      });
    }
  }, [ownerData, owner?.lineUserId, setAuth, token]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([mutateOwner(), mutateSummary()]);
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
    const nextReservation = summary?.next_reservation;
    if (!nextReservation) return;

    const setLoading = mode === 'checkin' ? setCheckingIn : setCheckingOut;
    const endpoint = mode === 'checkin' ? '/check-in' : '/check-out';
    const successMsg = mode === 'checkin'
      ? `${statusLabels.checkIn}が完了しました！`
      : `${statusLabels.checkOut}が完了しました！`;
    const errorMsg = mode === 'checkin'
      ? `${statusLabels.checkIn}に失敗しました`
      : `${statusLabels.checkOut}に失敗しました`;

    setLoading(true);
    try {
      await liffClient.post(endpoint, {
        qrCode,
        reservationId: nextReservation.id,
      });
      closeQrModal();
      showToast(successMsg, 'success');
      await Promise.all([mutateSummary(), mutateOwner()]);
    } catch (error) {
      showToast(getQrActionErrorMessage(error, errorMsg), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    const nextReservation = summary?.next_reservation;
    if (!nextReservation) {
      showToast('予約が見つかりません', 'warning');
      return;
    }

    const reservationDate = new Date(nextReservation.reservation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    reservationDate.setHours(0, 0, 0, 0);

    if (reservationDate < today) {
      showToast('この予約は過去の予約です', 'warning');
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
    const nextReservation = summary?.next_reservation;
    if (!nextReservation) {
      showToast('予約が見つかりません', 'warning');
      return;
    }

    if (nextReservation.status !== '登園済') {
      showToast(`まだ${statusLabels.active}ではありません`, 'warning');
      return;
    }

    if (nextReservation.checked_out_at) {
      showToast(`既に${statusLabels.done}です`, 'warning');
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
      showToast('QRコードの内容を入力してください', 'warning');
      return;
    }
    processQrAction(qrInput.trim(), qrModalMode);
  };

  if ((ownerLoading && !ownerData) || (summaryLoading && !summary)) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon icon="solar:spinner-bold" width="48" height="48" className="text-primary animate-spin" />
      </div>
    );
  }

  if (summaryError || !summary) {
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

  const nextReservation = summary.next_reservation;
  const latestRecord = summary.latest_record;
  const latestAnnouncement = summary.announcements.latest;

  const daysUntil = nextReservation
    ? differenceInDays(new Date(nextReservation.reservation_date), new Date())
    : null;

  return (
    <div className="px-5 pt-6 pb-28 space-y-5">
      <h1 className="sr-only">ホーム</h1>

      {refreshing && (
        <div className="flex items-center justify-center py-2">
          <Icon icon="solar:spinner-bold" width="20" height="20" className="text-primary animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">更新中...</span>
        </div>
      )}

      <section
        className="rounded-2xl px-4 py-3 border"
        style={{
          borderColor: `${businessColors.primary}33`,
          background: `linear-gradient(120deg, ${businessColors.pale}, #FFFFFF)`,
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${businessColors.primary}1F` }}>
              <Icon icon={businessTypeIcon} width="16" height="16" style={{ color: businessColors.primary }} />
            </span>
            <p className="text-sm font-bold">{businessTypeLabel}モード</p>
          </div>
          <button
            onClick={handleRefresh}
            className="text-xs font-bold px-3 py-1.5 rounded-full border active:scale-95 transition-transform"
            style={{ borderColor: `${businessColors.primary}33`, color: businessColors.primary }}
          >
            更新
          </button>
        </div>
      </section>

      {nextReservation ? (
        <div className="space-y-3">
          <section
            className="rounded-3xl p-5 border active:scale-[0.99] transition-transform cursor-pointer"
            style={{
              background: `linear-gradient(130deg, ${businessColors.pale} 0%, #FFFFFF 100%)`,
              borderColor: `${businessColors.primary}33`,
            }}
            onClick={() => navigate('/home/reservations')}
            role="button"
            aria-label={`次回${statusLabels.checkIn}予定を確認`}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold font-heading flex items-center gap-2">
                <Icon icon="solar:calendar-check-bold" width="20" height="20" className="text-primary" />
                次回{statusLabels.checkIn}予定
              </h2>
              {daysUntil !== null && daysUntil >= 0 && (
                <span
                  className="text-[10px] text-white px-2.5 py-1 rounded-full font-bold animate-pulse"
                  style={{ backgroundColor: businessColors.primary }}
                >
                  {daysUntil === 0 ? '本日' : daysUntil === 1 ? '明日' : `あと${daysUntil}日`}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              {nextReservation.dog_photo ? (
                <LazyImage
                  src={getAvatarUrl(nextReservation.dog_photo)}
                  alt={nextReservation.dog_name}
                  width={52}
                  height={52}
                  className="size-13 rounded-full border-3 border-white object-cover shadow-md"
                />
              ) : (
                <div className="size-13 rounded-full border-3 border-white bg-primary/10 flex items-center justify-center shadow-md">
                  <Icon icon="solar:paw-print-bold" width="24" height="24" className="text-primary" />
                </div>
              )}

              <div className="flex-1">
                <p className="text-lg font-bold text-foreground">
                  {format(new Date(nextReservation.reservation_date), 'M月d日 (E)', { locale: ja })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nextReservation.dog_name} {nextReservation.reservation_time?.slice(0, 5)}
                </p>
              </div>

              <div className="size-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${businessColors.primary}1A`, color: businessColors.primary }}>
                <Icon icon="solar:arrow-right-linear" width="20" height="20" />
              </div>
            </div>
          </section>

          {isToday(new Date(nextReservation.reservation_date)) &&
           nextReservation.status === '予定' && (
            nextReservation.has_pre_visit_input ? (
              <button
                onClick={() => navigate(`/home/pre-visit/${nextReservation.id}`)}
                className="w-full bg-chart-2/10 text-chart-2 py-3 rounded-xl font-medium
                           min-h-[48px] flex items-center justify-center gap-2 border border-chart-2/20
                           active:scale-95 transition-transform hover:bg-chart-2/20"
              >
                <Icon icon="solar:check-circle-bold" className="size-5" />
                {preVisitLabel} 入力済み
                <Icon icon="solar:pen-linear" className="size-4 ml-1 opacity-60" />
              </button>
            ) : (
              <button
                onClick={() => navigate(`/home/pre-visit/${nextReservation.id}`)}
                className="w-full bg-chart-3/10 text-chart-3 py-3 rounded-xl font-bold
                           active:scale-95 transition-transform min-h-[48px]
                           flex items-center justify-center gap-2 border border-chart-3/30
                           hover:bg-chart-3/20"
              >
                <Icon icon="solar:clipboard-text-bold" className="size-5" />
                {preVisitLabel}を入力する
              </button>
            )
          )}

          {isToday(new Date(nextReservation.reservation_date)) && (
            <>
              {nextReservation.checked_out_at ? (
                <div className="w-full bg-chart-2/10 text-chart-2 py-4 rounded-xl font-bold min-h-[56px] flex items-center justify-center gap-2">
                  <Icon icon="mdi:check-circle" className="size-5" />
                  本日の{statusLabels.done}
                </div>
              ) : nextReservation.status === '登園済' ? (
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
                      {statusLabels.checkOut}処理中...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:qr-code-bold" className="size-5" />
                      {statusLabels.checkOut}する（QRコードスキャン）
                    </>
                  )}
                </button>
              ) : nextReservation.status === '降園済' ? (
                <div className="w-full bg-chart-2/10 text-chart-2 py-4 rounded-xl font-bold min-h-[56px] flex items-center justify-center gap-2">
                  <Icon icon="mdi:check-circle" className="size-5" />
                  本日の{statusLabels.done}
                </div>
              ) : (
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
                      {statusLabels.checkIn}処理中...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:qr-code-bold" className="size-5" />
                      {statusLabels.checkIn}する（QRコードスキャン）
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
            className="bg-primary text-primary-foreground px-6 py-2 rounded-xl text-sm font-bold active:scale-95 transition-transform"
          >
            予約する
          </button>
        </section>
      )}

      <div className="space-y-3">
        <DashboardCard
          onClick={() => latestRecord ? navigate(`/home/records/${latestRecord.id}`) : navigate('/home/records')}
          icon="solar:clipboard-text-bold"
          iconColor={businessColors.primary}
          iconBg={`${businessColors.primary}1A`}
          title={`最新の${recordLabel}`}
          description={latestRecord
            ? `${latestRecord.dog_name} / ${format(new Date(latestRecord.record_date), 'M月d日')}\n${latestRecord.excerpt || '記録が更新されました'}`
            : `まだ${recordLabel}はありません`}
          actionLabel={latestRecord ? `${recordLabel}詳細へ` : `${recordLabel}一覧へ`}
          badge={latestRecord ? (
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
              写真 {latestRecord.photo_count}枚
            </span>
          ) : undefined}
        />

        <DashboardCard
          onClick={() => navigate('/home/announcements')}
          icon="solar:bell-bold"
          iconColor={businessColors.primary}
          iconBg={`${businessColors.primary}1A`}
          title="お知らせ"
          description={latestAnnouncement
            ? `${latestAnnouncement.title}\n${summary.announcements.unread > 0 ? `未読 ${summary.announcements.unread} 件` : '未読はありません'}`
            : '新しいお知らせはありません'}
          actionLabel="お知らせ一覧へ"
          badge={summary.announcements.unread > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-destructive text-white">
              未読 {summary.announcements.unread}
            </span>
          ) : (
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
              {summary.announcements.total}件
            </span>
          )}
        />
      </div>

      {showQrModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div
            className="bg-card rounded-3xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-base font-bold font-heading flex items-center gap-2">
                <Icon icon="solar:qr-code-bold" width="20" height="20" className="text-primary" />
                {qrModalMode === 'checkout' ? `${statusLabels.checkOut}QRコード入力` : `${statusLabels.checkIn}QRコード入力`}
              </h2>
              <button
                onClick={closeQrModal}
                className="size-10 rounded-full flex items-center justify-center hover:bg-muted active:scale-95 transition-all"
                aria-label="閉じる"
              >
                <Icon icon="solar:close-circle-bold" width="24" height="24" className="text-muted-foreground" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {qrError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <Icon icon="solar:info-circle-bold" width="20" height="20" className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive whitespace-pre-line leading-relaxed">{qrError}</p>
                  </div>
                </div>
              )}

              <div className="bg-muted/50 rounded-2xl p-4">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  店舗に設置されているQRコードをスキャンできない場合は、スタッフにQRコードの内容をお伝えいただくか、以下に手動で入力してください。
                </p>
              </div>

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
