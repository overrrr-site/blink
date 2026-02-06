import pool from '../db/connection.js';
import { fetchTrainingLabels } from './aiService.js';

export type AISuggestionType =
  | 'photo-concern'
  | 'health-history'
  | 'report-draft'
  | 'weight-change'
  | 'long-absence'
  | 'birthday'
  | 'follow-up'
  | 'training-progress'
  | 'long-stay';

export interface AISuggestion {
  type: AISuggestionType;
  message: string;
  preview?: string;
  actionLabel?: string;
  variant?: 'default' | 'warning' | 'success';
  payload?: Record<string, unknown>;
}

const TRAINING_LABELS: Record<string, string> = {
  voice_cue: '声かけでプログラム',
  relax_position: 'リラックスポジション',
  house_training: 'ハウストレーニング',
  eye_contact_toilet: 'アイコンタクト',
  disc: 'ディスク',
  ball_catch: 'ボールキャッチ/レット',
  eye_contact: 'アイコンタクト',
  sit: 'オスワリ',
  down: 'フセ',
  stay: 'マテ',
  come: 'オイデ',
  heel: 'ツイテ',
  dog_interaction: '他犬との交流',
  human_interaction: '人慣れ',
  environment: '環境慣れ',
  handling: 'ハンドリング',
  teeth_brushing: '歯磨き練習',
  barking: '吠え対策',
  biting: '噛み対策',
  pulling: '引っ張り対策',
  jumping: '飛びつき対策',
};

const HEALTH_ITEM_LABELS: Record<string, string> = {
  ears: '耳',
  nails: '爪',
  skin: '皮膚',
  teeth: '歯',
};

function findConsistentTrainingItems(
  historyRows: Array<{ daycare_data?: { training_data?: Record<string, string> } }>,
  labels: Record<string, string>
): string[] {
  if (historyRows.length < 3) return [];

  const itemCounts: Record<string, number> = {};

  for (const row of historyRows) {
    const trainingData = row.daycare_data?.training_data;
    if (!trainingData) continue;

    for (const [key, value] of Object.entries(trainingData)) {
      if (value === 'done') {
        itemCounts[key] = (itemCounts[key] || 0) + 1;
      }
    }
  }

  const consistentItems: string[] = [];
  for (const [key, count] of Object.entries(itemCounts)) {
    if (count >= 3) {
      const label = labels[key] || TRAINING_LABELS[key] || key;
      consistentItems.push(label);
    }
  }

  return consistentItems;
}

export async function getAISuggestions(recordId: string, storeId: number): Promise<{
  record: any | null;
  suggestions: AISuggestion[];
}> {
  const recordResult = await pool.query(
    `SELECT id, dog_id, record_type, record_date, notes, health_check, photos, hotel_data, daycare_data
     FROM records
     WHERE id = $1 AND store_id = $2 AND deleted_at IS NULL`,
    [recordId, storeId]
  );

  if (recordResult.rows.length === 0) {
    return { record: null, suggestions: [] };
  }

  const record = recordResult.rows[0];
  const suggestions: AISuggestion[] = [];

  const dogResult = await pool.query(
    'SELECT name, birth_date FROM dogs WHERE id = $1',
    [record.dog_id]
  );
  const dog = dogResult.rows[0];

  const prevRecordResult = await pool.query(
    `SELECT id, record_date, notes, health_check, photos
     FROM records
     WHERE dog_id = $1 AND store_id = $2 AND id <> $3
       AND deleted_at IS NULL
     ORDER BY record_date DESC
     LIMIT 1`,
    [record.dog_id, storeId, recordId]
  );
  const prevRecord = prevRecordResult.rows[0];

  const reportText = record.notes?.report_text || '';
  if (!reportText || reportText.trim().length === 0) {
    suggestions.push({
      type: 'report-draft',
      message: '入力内容から報告文を作成しました',
      actionLabel: '下書きを使用',
      variant: 'default',
      preview: 'AIで報告文を生成できます',
    });
  }

  if (dog?.birth_date) {
    const today = new Date();
    const birthDate = new Date(dog.birth_date);
    const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    let daysUntil = Math.floor((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
      daysUntil = Math.floor((nextYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (daysUntil >= 0 && daysUntil <= 7) {
      suggestions.push({
        type: 'birthday',
        message: daysUntil === 0
          ? `今日は${dog.name}ちゃんのお誕生日です！🎂`
          : `${dog.name}ちゃんのお誕生日まであと${daysUntil}日です`,
        actionLabel: 'お祝いメッセージを追加',
        variant: 'success',
      });
    }
  }

  if (prevRecord) {
    const currentDate = new Date(record.record_date);
    const prevDate = new Date(prevRecord.record_date);
    const daysSince = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince > 30) {
      suggestions.push({
        type: 'long-absence',
        message: `${daysSince}日ぶりのご来店です`,
        actionLabel: '報告文で触れる',
        variant: 'default',
      });
    }
  }

  if (prevRecord?.photos?.concerns && Array.isArray(prevRecord.photos.concerns) && prevRecord.photos.concerns.length > 0) {
    const concernLabel = prevRecord.photos.concerns[0]?.label || '気になる点';
    suggestions.push({
      type: 'follow-up',
      message: `前回「${concernLabel}」の記録がありました`,
      actionLabel: '今回の様子を確認',
      variant: 'warning',
      payload: { prevConcerns: prevRecord.photos.concerns },
    });
  }

  if (record.record_type === 'grooming') {
    const historyResult = await pool.query(
      `SELECT health_check
       FROM records
       WHERE dog_id = $1 AND store_id = $2 AND record_type = 'grooming'
         AND deleted_at IS NULL AND id <> $3
       ORDER BY record_date DESC
       LIMIT 2`,
      [record.dog_id, storeId, recordId]
    );

    const currentWeight = record.health_check?.weight;
    const prevWeight = prevRecord?.health_check?.weight;
    if (currentWeight && prevWeight && prevWeight > 0) {
      const change = ((currentWeight - prevWeight) / prevWeight) * 100;
      if (Math.abs(change) >= 10) {
        suggestions.push({
          type: 'weight-change',
          message: `体重が前回より${change > 0 ? '+' : ''}${change.toFixed(1)}%変化しています`,
          actionLabel: '報告文に追記',
          variant: Math.abs(change) > 15 ? 'warning' : 'default',
        });
      }
    }

    const healthItems = ['ears', 'nails', 'skin', 'teeth'] as const;
    const abnormalValues = ['汚れ', '伸びている', '異常あり', '要注意', '汚れあり'];

    for (const item of healthItems) {
      const currentValue = record.health_check?.[item];
      if (currentValue && abnormalValues.includes(currentValue)) {
        const count = historyResult.rows.filter((row: any) =>
          row.health_check?.[item] && abnormalValues.includes(row.health_check[item])
        ).length;

        if (count >= 1) {
          const itemLabel = HEALTH_ITEM_LABELS[item] || item;
          suggestions.push({
            type: 'health-history',
            message: `${itemLabel}の状態が続いています（${currentValue}）`,
            actionLabel: '報告文に追記',
            variant: 'warning',
          });
          break;
        }
      }
    }
  }

  if (record.record_type === 'daycare') {
    const trainingHistoryResult = await pool.query(
      `SELECT daycare_data
       FROM records
       WHERE dog_id = $1 AND store_id = $2 AND record_type = 'daycare'
         AND deleted_at IS NULL
       ORDER BY record_date DESC
       LIMIT 5`,
      [record.dog_id, storeId]
    );

    const customLabels = await fetchTrainingLabels(storeId);
    const consistentItems = findConsistentTrainingItems(trainingHistoryResult.rows, customLabels);
    if (consistentItems.length > 0) {
      const displayItems = consistentItems.slice(0, 2).join('、');
      suggestions.push({
        type: 'training-progress',
        message: `${displayItems}${consistentItems.length > 2 ? 'など' : ''}が連続でできています！`,
        actionLabel: '成長を報告文に追記',
        variant: 'success',
      });
    }
  }

  if (record.record_type === 'hotel') {
    const nights = record.hotel_data?.nights;
    if (nights && nights >= 2) {
      suggestions.push({
        type: 'long-stay',
        message: `${nights}泊の長期滞在です`,
        actionLabel: '滞在中の様子を詳しく記録',
        variant: 'default',
      });
    }
  }

  return { record, suggestions };
}
