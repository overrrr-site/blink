import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Journal {
  id: number;
  journal_date: string;
  dog_name: string;
  dog_photo: string;
  staff_name: string;
  comment: string;
  photos: string[];
  morning_urination: boolean;
  morning_defecation: boolean;
  afternoon_urination: boolean;
  afternoon_defecation: boolean;
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
      } catch (error) {
        console.error('Error fetching journal:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJournal();
  }, [id]);

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

  if (!journal) {
    return (
      <div className="px-5 pt-6 text-center">
        <iconify-icon icon="solar:notebook-linear" width="64" height="64" class="text-muted-foreground mx-auto mb-4"></iconify-icon>
        <p className="text-muted-foreground mb-4">日誌が見つかりません</p>
        <button
          onClick={() => navigate('/journals')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          日誌一覧に戻る
        </button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-6 pb-28 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">日誌詳細</h1>
      </div>

      {/* 犬情報 */}
      <div className="flex items-center gap-3">
        {journal.dog_photo ? (
          <img
            src={journal.dog_photo}
            alt={journal.dog_name}
            className="size-16 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
            <iconify-icon icon="solar:paw-print-bold" width="32" height="32" class="text-primary"></iconify-icon>
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold font-heading">{journal.dog_name}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <iconify-icon icon="solar:calendar-linear" width="16" height="16"></iconify-icon>
            {format(new Date(journal.journal_date), 'yyyy年M月d日', { locale: ja })}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <iconify-icon icon="solar:user-linear" width="14" height="14"></iconify-icon>
            {journal.staff_name}
          </p>
        </div>
      </div>

      {/* トイレ情報 */}
      <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
        <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
          <iconify-icon icon="solar:toilet-paper-bold" width="20" height="20" class="text-chart-3"></iconify-icon>
          トイレ
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">午前</p>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm ${journal.morning_urination ? 'text-chart-2' : 'text-muted-foreground'}`}>
                <iconify-icon icon={journal.morning_urination ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} width="16" height="16"></iconify-icon>
                オシッコ
              </div>
              <div className={`flex items-center gap-2 text-sm ${journal.morning_defecation ? 'text-chart-2' : 'text-muted-foreground'}`}>
                <iconify-icon icon={journal.morning_defecation ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} width="16" height="16"></iconify-icon>
                ウンチ
              </div>
            </div>
          </div>
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">午後</p>
            <div className="space-y-1">
              <div className={`flex items-center gap-2 text-sm ${journal.afternoon_urination ? 'text-chart-2' : 'text-muted-foreground'}`}>
                <iconify-icon icon={journal.afternoon_urination ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} width="16" height="16"></iconify-icon>
                オシッコ
              </div>
              <div className={`flex items-center gap-2 text-sm ${journal.afternoon_defecation ? 'text-chart-2' : 'text-muted-foreground'}`}>
                <iconify-icon icon={journal.afternoon_defecation ? 'solar:check-circle-bold' : 'solar:close-circle-linear'} width="16" height="16"></iconify-icon>
                ウンチ
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* コメント */}
      {journal.comment && (
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:chat-round-dots-bold" width="20" height="20" class="text-chart-4"></iconify-icon>
            今日の様子
          </h2>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{journal.comment}</p>
        </section>
      )}

      {/* 写真 */}
      {journal.photos && journal.photos.length > 0 && (
        <section className="bg-card rounded-3xl p-5 border border-border shadow-sm">
          <h2 className="text-base font-bold font-heading mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:gallery-bold" width="20" height="20" class="text-primary"></iconify-icon>
            活動写真 ({journal.photos.length}枚)
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {journal.photos.map((photo, idx) => (
              <img
                key={idx}
                src={photo}
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
