import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import liffClient from '../api/client';
import { getAxiosErrorMessage } from '../../utils/error';
import type { IntakeSummary } from '../hooks/useIntakeChat';

interface IntakeResultData extends IntakeSummary {
  completed_at: string;
}

export default function IntakeResult() {
  const { dogId } = useParams<{ dogId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<IntakeResultData | null>(null);
  const [dogName, setDogName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dogId) return;

    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await liffClient.get(`/intake/result/${dogId}`);
        const result = response.data.data;
        setData(result);

        const dogsResponse = await liffClient.get('/intake/dogs');
        const dogs = dogsResponse.data.data as { id: number; name: string }[];
        const dog = dogs.find(d => d.id === parseInt(dogId, 10));
        if (dog) setDogName(dog.name);
      } catch (err) {
        setError(getAxiosErrorMessage(err, 'カルテの取得に失敗しました'));
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [dogId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Icon icon="solar:spinner-bold" width="48" height="48" className="text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-5 pt-6 text-center">
        <Icon icon="solar:cloud-cross-bold" width="64" height="64" className="text-muted-foreground mx-auto mb-4" />
        <p className="text-sm text-muted-foreground mb-4">{error || 'データが見つかりません'}</p>
        <button
          onClick={() => navigate(-1)}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold active:scale-95 transition-transform"
        >
          戻る
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-stone-50">
      <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center gap-2 shrink-0 safe-area-top">
        <button
          onClick={() => navigate(-1)}
          className="size-10 rounded-full flex items-center justify-center hover:bg-stone-100 active:scale-95 transition-all"
          aria-label="戻る"
        >
          <Icon icon="solar:alt-arrow-left-linear" width="20" height="20" />
        </button>
        <h1 className="text-sm font-bold">{dogName ? `${dogName}のカルテ` : 'カルテ'}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-28">
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="bg-[#6366F1]/5 px-5 py-4 border-b border-stone-100">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Icon icon="solar:paw-print-bold" width="20" height="20" className="text-[#6366F1]" />
              {dogName ? `${dogName}のカルテ` : 'うちの子カルテ'}
            </h2>
          </div>
          <div className="p-5">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {data.ai_summary}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="bg-primary/5 px-5 py-4 border-b border-stone-100">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Icon icon="solar:star-bold" width="20" height="20" className="text-primary" />
              おすすめ教育プラン
            </h2>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon icon="solar:home-2-bold" width="14" height="14" />
                園での過ごし方
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {data.education_plan.daycare_plan}
              </p>
            </div>
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon icon="solar:home-smile-bold" width="14" height="14" />
                家庭でのアドバイス
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {data.education_plan.home_advice}
              </p>
            </div>
            <div className="border-t border-stone-100 pt-4">
              <h3 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <Icon icon="solar:flag-bold" width="14" height="14" />
                3ヶ月の目標
              </h3>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {data.education_plan.three_month_goals}
              </p>
            </div>
          </div>
        </div>

        {data.completed_at && (
          <p className="text-xs text-muted-foreground text-center">
            {new Date(data.completed_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
            に作成
          </p>
        )}
      </div>
    </div>
  );
}
