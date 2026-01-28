import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import liffClient from '../api/client';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getListThumbnailUrl, getDetailThumbnailUrl } from '../../utils/image';

interface Announcement {
  id: number;
  title: string;
  content: string;
  image_url: string | null;
  is_important: boolean;
  published_at: string;
  created_at: string;
}

export default function Announcements() {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchAnnouncements = async () => {
    try {
      const response = await liffClient.get('/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
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
        <h1 className="text-lg font-bold font-heading flex-1">お知らせ</h1>
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

      {announcements.length === 0 ? (
        <div className="bg-card rounded-2xl p-8 border border-border shadow-sm text-center">
          <iconify-icon
            icon="solar:megaphone-linear"
            width="64"
            height="64"
            class="text-muted-foreground mx-auto mb-4"
          ></iconify-icon>
          <p className="text-muted-foreground mb-2">お知らせはありません</p>
          <p className="text-xs text-muted-foreground">
            新しいお知らせがあるとここに表示されます
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 件数表示 */}
          <p className="text-xs text-muted-foreground">
            {announcements.length}件のお知らせ
          </p>

          {announcements.map((announcement) => {
            const isExpanded = expandedId === announcement.id;

            return (
              <div
                key={announcement.id}
                className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                {/* ヘッダー（タップで展開） */}
                <button
                  onClick={() => toggleExpand(announcement.id)}
                  className="w-full p-4 text-left hover:bg-muted/30 active:bg-muted transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {/* アイコンまたは画像サムネイル */}
                    {announcement.image_url ? (
                      <div className="size-12 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img
                          src={getListThumbnailUrl(announcement.image_url)}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`size-12 rounded-lg flex items-center justify-center shrink-0 ${
                        announcement.is_important ? 'bg-chart-4/10' : 'bg-primary/10'
                      }`}>
                        <iconify-icon
                          icon={announcement.is_important ? 'solar:star-bold' : 'solar:megaphone-bold'}
                          className={`size-6 ${announcement.is_important ? 'text-chart-4' : 'text-primary'}`}
                        ></iconify-icon>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {announcement.is_important && (
                          <span className="px-1.5 py-0.5 bg-chart-4/10 text-chart-4 text-[10px] font-bold rounded">
                            重要
                          </span>
                        )}
                        <h3 className="font-bold text-sm truncate flex-1">{announcement.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <iconify-icon icon="solar:calendar-linear" width="14" height="14"></iconify-icon>
                        {format(new Date(announcement.published_at), 'yyyy年M月d日', { locale: ja })}
                      </p>
                      {!isExpanded && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                          {announcement.content}
                        </p>
                      )}
                    </div>

                    <iconify-icon
                      icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'}
                      width="20"
                      height="20"
                      class="text-muted-foreground shrink-0 mt-1"
                    ></iconify-icon>
                  </div>
                </button>

                {/* 展開時の詳細 */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* 画像 */}
                    {announcement.image_url && (
                      <div className="p-4 pb-0">
                        <img
                          src={getDetailThumbnailUrl(announcement.image_url)}
                          alt=""
                          loading="lazy"
                          className="w-full rounded-lg object-cover max-h-64"
                        />
                      </div>
                    )}

                    {/* 本文 */}
                    <div className="p-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {announcement.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
