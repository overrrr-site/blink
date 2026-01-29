import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon'
import { useParams, useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getAvatarUrl, getDetailThumbnailUrl } from '../../utils/image';
import { LazyImage } from '../../components/LazyImage';

interface Journal {
  id: number;
  journal_date: string;
  dog_name: string;
  dog_photo: string;
  staff_name: string;
  comment: string;
  photos: string[];
  morning_toilet_status: string;
  morning_toilet_location: string;
  afternoon_toilet_status: string;
  afternoon_toilet_location: string;
}

// トイレステータスに応じたアイコンと色を取得
function getToiletStatusStyle(status: string | null | undefined) {
  if (!status || status === '未選択' || status === '') {
    return {
      icon: 'mdi:minus-circle-outline',
      colorClass: 'text-muted-foreground',
      label: '-',
    };
  }
  if (status === '成功') {
    return {
      icon: 'mdi:check-circle',
      colorClass: 'text-chart-2',
      label: '成功',
    };
  }
  if (status === '一部成功') {
    return {
      icon: 'mdi:check-circle-outline',
      colorClass: 'text-chart-3',
      label: '一部成功',
    };
  }
  // 失敗
  return {
    icon: 'mdi:close-circle',
    colorClass: 'text-destructive',
    label: status,
  };
}

export default function JournalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [journal, setJournal] = useState<Journal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJournal = async () => {
      try {
        const response = await liffClient.get('/journals');
        const journal = response.data.find((j: any) => j.id === parseInt(id || '0'));
        if (journal) {
          setJournal(journal);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };

    fetchJournal();
  }, [id]);

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

  if (!journal) {
    return (
      <div className="px-5 pt-6 text-center">
        <Icon icon="solar:notebook-linear" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">日誌が見つかりません</p>
        <button
          onClick={() => navigate('/home/journals')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          日誌一覧に戻る
        </button>
      </div>
    );
  }

  const morningStatus = getToiletStatusStyle(journal.morning_toilet_status);
  const afternoonStatus = getToiletStatusStyle(journal.afternoon_toilet_status);

  return (
    <div className="px-5 pt-6 pb-28 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <Icon icon="solar:arrow-left-linear" width="24" height="24" />
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">日誌詳細</h1>
      </div>

      {/* 犬情報 */}
      <div className="flex items-center gap-3">
        {journal.dog_photo ? (
          <LazyImage
            src={getAvatarUrl(journal.dog_photo)}
            alt={journal.dog_name}
            width={64}
            height={64}
            className="size-16 rounded-full border-2 border-primary/20"
          />
        ) : (
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <Icon icon="solar:paw-print-bold" width="32" height="32" className="text-primary" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold font-heading">{journal.dog_name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Icon icon="solar:calendar-linear" width="16" height="16" />
            {format(new Date(journal.journal_date), 'yyyy年M月d日', { locale: ja })}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Icon icon="solar:user-linear" width="14" height="14" />
            {journal.staff_name}
          </p>
        </div>
      </div>

      {/* トイレ情報 */}
      <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
        <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
          <Icon icon="solar:toilet-paper-bold" width="20" height="20" className="text-chart-3" />
          トイレ
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">午前</p>
            <div className={`flex items-center gap-2 text-sm font-medium ${morningStatus.colorClass}`}>
              <Icon icon={morningStatus.icon} width="18" height="18" />
              {morningStatus.label}
            </div>
            {journal.morning_toilet_location && (
              <p className="text-xs text-muted-foreground mt-1.5">{journal.morning_toilet_location}</p>
            )}
          </div>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">午後</p>
            <div className={`flex items-center gap-2 text-sm font-medium ${afternoonStatus.colorClass}`}>
              <Icon icon={afternoonStatus.icon} width="18" height="18" />
              {afternoonStatus.label}
            </div>
            {journal.afternoon_toilet_location && (
              <p className="text-xs text-muted-foreground mt-1.5">{journal.afternoon_toilet_location}</p>
            )}
          </div>
        </div>
      </section>

      {/* コメント */}
      {journal.comment && (
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <Icon icon="solar:chat-round-dots-bold" width="20" height="20" className="text-chart-4" />
            今日の様子
          </h2>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{journal.comment}</p>
        </section>
      )}

      {/* 写真 */}
      {journal.photos && journal.photos.length > 0 && (
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <Icon icon="solar:gallery-bold" width="20" height="20" className="text-primary" />
            活動写真 ({journal.photos.length}枚)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {journal.photos.map((photo, idx) => (
              <LazyImage
                key={idx}
                src={getDetailThumbnailUrl(photo)}
                alt={`${journal.dog_name}の写真 ${idx + 1}`}
                className="w-full aspect-square rounded-xl object-cover"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
