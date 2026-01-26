import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * クイックリプライボタンを作成
 */
export function createQuickReply() {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '予約確認',
          data: 'action=view_reservations',
        },
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '日誌を見る',
          data: 'action=view_journals',
        },
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '契約情報',
          data: 'action=view_contracts',
        },
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: 'ヘルプ',
          data: 'action=help',
        },
      },
    ],
  };
}

/**
 * 予約カードのFlexメッセージを作成
 */
export function createReservationFlexMessage(reservation: any) {
  const reservationDate = format(new Date(reservation.reservation_date), 'M月d日(E)', { locale: ja });
  const reservationTime = reservation.reservation_time.substring(0, 5);
  const statusEmoji = reservation.status === 'チェックイン済' ? '✅' : '📅';
  const statusColor = reservation.status === 'チェックイン済' ? '#10B981' : '#3B82F6';

  return {
    type: 'flex',
    altText: `${reservationDate} ${reservationTime} - ${reservation.dog_name}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${statusEmoji} 予約`,
            weight: 'bold',
            size: 'lg',
            color: statusColor,
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '日時',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `${reservationDate} ${reservationTime}`,
                    size: 'sm',
                    color: '#000000',
                    align: 'end',
                    flex: 2,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'ワンちゃん',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: reservation.dog_name,
                    size: 'sm',
                    color: '#000000',
                    align: 'end',
                    flex: 2,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'ステータス',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: reservation.status,
                    size: 'sm',
                    color: statusColor,
                    align: 'end',
                    flex: 2,
                    weight: 'bold',
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: reservation.status === '予定' ? {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'キャンセル',
              data: `action=cancel_reservation&reservation_id=${reservation.id}`,
            },
            color: '#EF4444',
          },
        ],
      } : undefined,
    },
  };
}

/**
 * 日誌カードのFlexメッセージを作成
 */
export function createJournalFlexMessage(journal: any) {
  const journalDate = format(new Date(journal.journal_date), 'yyyy年M月d日(E)', { locale: ja });
  const commentPreview = journal.comment
    ? (journal.comment.length > 50 ? journal.comment.substring(0, 50) + '...' : journal.comment)
    : 'コメントなし';

  return {
    type: 'flex',
    altText: `${journalDate} - ${journal.dog_name}の日誌`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📝 日誌',
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF',
          },
        ],
        backgroundColor: '#3B82F6',
        paddingAll: 'md',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: journalDate,
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'text',
                text: `🐕 ${journal.dog_name}`,
                size: 'sm',
                color: '#666666',
              },
              journal.staff_name ? {
                type: 'text',
                text: `👤 ${journal.staff_name}`,
                size: 'sm',
                color: '#666666',
              } : null,
              {
                type: 'separator',
                margin: 'md',
              },
              journal.morning_toilet_status ? {
                type: 'text',
                text: `午前のトイレ: ${journal.morning_toilet_status}`,
                size: 'sm',
                margin: 'sm',
              } : null,
              journal.afternoon_toilet_status ? {
                type: 'text',
                text: `午後のトイレ: ${journal.afternoon_toilet_status}`,
                size: 'sm',
                margin: 'sm',
              } : null,
              {
                type: 'text',
                text: commentPreview,
                size: 'sm',
                color: '#666666',
                wrap: true,
                margin: 'md',
              },
            ].filter(Boolean),
          },
        ],
        paddingAll: 'md',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'postback',
              label: '詳細を見る',
              data: `action=view_journal&journal_id=${journal.id}`,
            },
          },
        ],
      },
    },
  };
}

/**
 * 契約情報カードのFlexメッセージを作成
 */
export function createContractFlexMessage(contract: any, calculatedRemaining: number | null) {
  const startDate = format(new Date(contract.start_date), 'yyyy年M月d日', { locale: ja });
  const endDate = contract.end_date
    ? format(new Date(contract.end_date), 'yyyy年M月d日', { locale: ja })
    : '無期限';
  const validUntil = contract.valid_until
    ? format(new Date(contract.valid_until), 'yyyy年M月d日', { locale: ja })
    : '無期限';

  const priceLabel = contract.contract_type === '月謝制' ? '月額料金' : '料金';
  const price = contract.price ? Math.floor(contract.price).toLocaleString() : '-';

  return {
    type: 'flex',
    altText: `${contract.dog_name} - ${contract.course_name || contract.contract_type}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📋 契約情報',
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF',
          },
        ],
        backgroundColor: '#8B5CF6',
        paddingAll: 'md',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: contract.course_name || contract.contract_type,
                weight: 'bold',
                size: 'md',
              },
              {
                type: 'text',
                text: `🐕 ${contract.dog_name}`,
                size: 'sm',
                color: '#666666',
              },
              {
                type: 'separator',
                margin: 'md',
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '契約タイプ',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: contract.contract_type,
                    size: 'sm',
                    color: '#000000',
                    align: 'end',
                    flex: 2,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: priceLabel,
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `¥${price}`,
                    size: 'sm',
                    color: '#000000',
                    align: 'end',
                    flex: 2,
                    weight: 'bold',
                  },
                ],
              },
              contract.contract_type !== '月謝制' && calculatedRemaining !== null ? {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '残回数',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `${calculatedRemaining}回`,
                    size: 'sm',
                    color: calculatedRemaining > 0 ? '#10B981' : '#EF4444',
                    align: 'end',
                    flex: 2,
                    weight: 'bold',
                  },
                ],
              } : null,
              contract.contract_type === '月謝制' && contract.monthly_sessions ? {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '月間回数',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: `${contract.monthly_sessions}回`,
                    size: 'sm',
                    color: '#000000',
                    align: 'end',
                    flex: 2,
                  },
                ],
              } : null,
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '有効期限',
                    size: 'sm',
                    color: '#666666',
                    flex: 1,
                  },
                  {
                    type: 'text',
                    text: validUntil,
                    size: 'sm',
                    color: '#000000',
                    align: 'end',
                    flex: 2,
                  },
                ],
              },
            ].filter(Boolean),
          },
        ],
        paddingAll: 'md',
      },
    },
  };
}

/**
 * ヘルプメッセージを作成
 */
export function createHelpMessage() {
  return {
    type: 'flex',
    altText: '使い方ガイド',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '❓ 使い方ガイド',
            weight: 'bold',
            size: 'lg',
            color: '#FFFFFF',
          },
        ],
        backgroundColor: '#6366F1',
        paddingAll: 'md',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '以下のコマンドで操作できます：',
            weight: 'bold',
            size: 'sm',
            margin: 'md',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '📅 「予約確認」',
                size: 'sm',
                weight: 'bold',
              },
              {
                type: 'text',
                text: '今後の予約一覧を表示',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
              },
              {
                type: 'text',
                text: '📝 「予約する」',
                size: 'sm',
                weight: 'bold',
                margin: 'md',
              },
              {
                type: 'text',
                text: '新規予約を作成',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
              },
              {
                type: 'text',
                text: '❌ 「キャンセル」',
                size: 'sm',
                weight: 'bold',
                margin: 'md',
              },
              {
                type: 'text',
                text: '予約をキャンセル',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
              },
              {
                type: 'text',
                text: '📖 「日誌」「日報」',
                size: 'sm',
                weight: 'bold',
                margin: 'md',
              },
              {
                type: 'text',
                text: '日誌一覧を表示',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
              },
              {
                type: 'text',
                text: '📋 「契約」「残回数」',
                size: 'sm',
                weight: 'bold',
                margin: 'md',
              },
              {
                type: 'text',
                text: '契約情報と残回数を表示',
                size: 'xs',
                color: '#666666',
                margin: 'xs',
              },
            ],
          },
        ],
        paddingAll: 'md',
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'LIFFアプリを開く',
              uri: process.env.LIFF_ID ? `https://liff.line.me/${process.env.LIFF_ID}/home` : '#',
            },
          },
        ],
      },
    },
    quickReply: createQuickReply(),
  };
}
