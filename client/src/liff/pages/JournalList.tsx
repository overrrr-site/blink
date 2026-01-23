import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
}

export default function JournalList() {
  const navigate = useNavigate();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJournals = async () => {
    try {
      const response = await liffClient.get('/journals');
      setJournals(response.data);
    } catch (error) {
      console.error('Error fetching journals:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJournals();
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

  return (
    <div className="px-5 pt-6 pb-28">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-3 text-foreground rounded-full active:bg-muted transition-colors"
          aria-label="戻る"
        >
          <iconify-icon icon="solar:arrow-left-linear" width="24" height="24"></iconify-icon>
        </button>
        <h1 className="text-lg font-bold font-heading flex-1">日誌一覧</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center hover:bg-muted rounded-full transition-colors active:scale-95 disabled:opacity-50"
          aria-label="更新"
        >
          <iconify-icon 
            icon="solar:refresh-linear" 
            width="24"
            height="24"
            class={refreshing ? 'animate-spin' : ''}
          ></iconify-icon>
        </button>
      </div>

      {/* 更新中表示 */}
      {refreshing && (
        <div className="flex items-center justify-center py-2 mb-4">
          <iconify-icon icon="solar:spinner-bold" width="20" height="20" class="text-primary animate-spin mr-2"></iconify-icon>
          <span className="text-sm text-muted-foreground">更新中...</span>
        </div>
      )}

      {journals.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center">
          <iconify-icon
            icon="solar:notebook-linear"
            width="64"
            height="64"
            class="text-muted-foreground mx-auto mb-4"
          ></iconify-icon>
          <p className="text-muted-foreground mb-2">日誌がまだありません</p>
          <p className="text-xs text-muted-foreground">
            登園後にスタッフが日誌を作成します
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 件数表示 */}
          <p className="text-xs text-muted-foreground">
            {journals.length}件の日誌
          </p>

          {journals.map((journal) => (
            <button
              key={journal.id}
              onClick={() => navigate(`/journals/${journal.id}`)}
              className="w-full bg-card rounded-2xl p-4 border border-border shadow-sm text-left 
                         hover:bg-muted/50 active:bg-muted active:scale-[0.99] transition-all"
              aria-label={`${journal.dog_name}の${format(new Date(journal.journal_date), 'M月d日')}の日誌を見る`}
            >
              <div className="flex items-center gap-3 mb-3">
                {journal.dog_photo ? (
                  <img
                    src={journal.dog_photo}
                    alt={journal.dog_name}
                    className="size-14 rounded-full object-cover border-2 border-primary/20"
                  />
                ) : (
                  <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                    <iconify-icon icon="solar:paw-print-bold" width="28" height="28" class="text-primary"></iconify-icon>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base">{journal.dog_name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <iconify-icon icon="solar:calendar-linear" width="16" height="16"></iconify-icon>
                    {format(new Date(journal.journal_date), 'yyyy年M月d日', { locale: ja })}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <iconify-icon icon="solar:user-linear" width="14" height="14"></iconify-icon>
                    {journal.staff_name}
                  </p>
                </div>
                <iconify-icon
                  icon="solar:alt-arrow-right-linear"
                  width="20"
                  height="20"
                  class="text-muted-foreground shrink-0"
                ></iconify-icon>
              </div>

              {journal.comment && (
                <p className="text-sm text-foreground line-clamp-2 mb-3 pl-1">{journal.comment}</p>
              )}

              {journal.photos && journal.photos.length > 0 && (
                <div className="flex gap-2">
                  {journal.photos.slice(0, 3).map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={photo}
                        alt={`${journal.dog_name}の写真 ${idx + 1}`}
                        className="size-20 rounded-lg object-cover"
                      />
                      {idx === 0 && journal.photos.length > 0 && (
                        <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                          {journal.photos.length}枚
                        </div>
                      )}
                    </div>
                  ))}
                  {journal.photos.length > 3 && (
                    <div className="size-20 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        +{journal.photos.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
