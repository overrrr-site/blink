import { format } from 'date-fns';
import { ja } from 'date-fns/locale/ja';
import type { FlexBox, FlexBubble, FlexComponent, FlexMessage, FlexText, QuickReply } from '@line/bot-sdk';

// ---------------------------------------------------------------------------
// Data interfaces
// ---------------------------------------------------------------------------

interface ReservationData {
  id: number;
  reservation_date: string;
  reservation_time: string;
  dog_name: string;
  status: string;
  memo?: string | null;
}

interface JournalData {
  id: number;
  journal_date: string;
  dog_name: string;
  staff_name?: string | null;
  morning_toilet_status?: string | null;
  afternoon_toilet_status?: string | null;
  comment?: string | null;
}

interface ContractData {
  id: number;
  dog_name: string;
  course_name?: string | null;
  contract_type: string;
  price?: number | null;
  total_sessions?: number | null;
  monthly_sessions?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  valid_until?: string | null;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function compactFlexItems(items: Array<FlexComponent | null>): FlexComponent[] {
  return items.filter((item): item is FlexComponent => item !== null);
}

/**
 * 「ラベル: 値」の横並び行を生成する共通ビルダー
 */
function createLabelValueRow(
  label: string,
  value: string,
  options?: { valueColor?: string; valueBold?: boolean }
): FlexBox {
  return {
    type: 'box',
    layout: 'horizontal',
    contents: [
      { type: 'text', text: label, size: 'sm', color: '#666666', flex: 1 },
      {
        type: 'text',
        text: value,
        size: 'sm',
        color: options?.valueColor ?? '#000000',
        align: 'end',
        flex: 2,
        ...(options?.valueBold ? { weight: 'bold' } : {}),
      } as FlexText,
    ],
  };
}

/**
 * 色付きヘッダー付き Bubble を生成する共通ビルダー
 */
function createHeaderBubble(params: {
  headerText: string;
  headerColor: string;
  bodyContents: FlexComponent[];
  footerContents?: FlexComponent[];
}): FlexBubble {
  const bubble: FlexBubble = {
    type: 'bubble',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: params.headerText, weight: 'bold', size: 'lg', color: '#FFFFFF' },
      ],
      backgroundColor: params.headerColor,
      paddingAll: 'md',
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: params.bodyContents,
      paddingAll: 'md',
    },
  };

  if (params.footerContents) {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: params.footerContents,
    };
  }

  return bubble;
}

/**
 * LIFF URLを生成する
 */
function buildLiffUrl(path: string): string {
  const liffId = process.env.LIFF_ID;
  if (!liffId) return '#';
  return `https://liff.line.me/${liffId}${path}`;
}

/**
 * 日付を安全にフォーマット（nullや無効な値に対応）
 */
function formatSafeDate(dateValue: string | null | undefined, defaultText: string = '未設定'): string {
  if (!dateValue) return defaultText;
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return defaultText;
    return format(date, 'yyyy年M月d日', { locale: ja });
  } catch {
    return defaultText;
  }
}

/**
 * テキストを指定文字数で切り詰める
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * ステータスに対応する絵文字と色を返す
 */
function getStatusStyle(status: string): { emoji: string; color: string } {
  switch (status) {
    case '登園済':
      return { emoji: '✅', color: '#10B981' };
    case '降園済':
      return { emoji: '🏠', color: '#6B7280' };
    default:
      return { emoji: '📅', color: '#3B82F6' };
  }
}

// ---------------------------------------------------------------------------
// Exported message creators
// ---------------------------------------------------------------------------

/**
 * クイックリプライボタンを作成
 */
export function createQuickReply(): QuickReply {
  return {
    items: [
      { type: 'action', action: { type: 'postback', label: '予約確認', data: 'action=view_reservations' } },
      { type: 'action', action: { type: 'postback', label: '日誌を見る', data: 'action=view_journals' } },
      { type: 'action', action: { type: 'postback', label: '契約情報', data: 'action=view_contracts' } },
      { type: 'action', action: { type: 'postback', label: 'ヘルプ', data: 'action=help' } },
    ],
  };
}

/**
 * 予約カードのFlexメッセージを作成
 */
export function createReservationFlexMessage(reservation: ReservationData): FlexMessage {
  const reservationDate = format(new Date(reservation.reservation_date), 'M月d日(E)', { locale: ja });
  const reservationTime = reservation.reservation_time.substring(0, 5);
  const { emoji: statusEmoji, color: statusColor } = getStatusStyle(reservation.status);

  const bubble: FlexBubble = {
    type: 'bubble',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        { type: 'text', text: `${statusEmoji} 予約`, weight: 'bold', size: 'lg', color: statusColor },
        { type: 'separator', margin: 'md' },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          margin: 'md',
          contents: [
            createLabelValueRow('日時', `${reservationDate} ${reservationTime}`),
            createLabelValueRow('ワンちゃん', reservation.dog_name),
            createLabelValueRow('ステータス', reservation.status, { valueColor: statusColor, valueBold: true }),
          ],
        },
      ],
    },
  };

  if (reservation.status === '予定') {
    bubble.footer = {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      contents: [
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: { type: 'postback', label: 'キャンセル', data: `action=cancel_reservation&reservation_id=${reservation.id}` },
          color: '#EF4444',
        },
      ],
    };
  }

  return {
    type: 'flex',
    altText: `${reservationDate} ${reservationTime} - ${reservation.dog_name}`,
    contents: bubble,
  };
}

/**
 * 日誌カードのFlexメッセージを作成
 */
export function createJournalFlexMessage(journal: JournalData): FlexMessage {
  const journalDate = format(new Date(journal.journal_date), 'yyyy年M月d日(E)', { locale: ja });
  const commentPreview = journal.comment ? truncateText(journal.comment, 50) : 'コメントなし';

  const bodyItems: Array<FlexComponent | null> = [
    { type: 'text', text: journalDate, weight: 'bold', size: 'md' },
    { type: 'text', text: `🐕 ${journal.dog_name}`, size: 'sm', color: '#666666' },
    journal.staff_name ? { type: 'text', text: `👤 ${journal.staff_name}`, size: 'sm', color: '#666666' } : null,
    { type: 'separator', margin: 'md' },
    journal.morning_toilet_status ? { type: 'text', text: `午前のトイレ: ${journal.morning_toilet_status}`, size: 'sm', margin: 'sm' } : null,
    journal.afternoon_toilet_status ? { type: 'text', text: `午後のトイレ: ${journal.afternoon_toilet_status}`, size: 'sm', margin: 'sm' } : null,
    { type: 'text', text: commentPreview, size: 'sm', color: '#666666', wrap: true, margin: 'md' },
  ];

  const bubble = createHeaderBubble({
    headerText: '📝 日誌',
    headerColor: '#3B82F6',
    bodyContents: [
      { type: 'box', layout: 'vertical', spacing: 'sm', contents: compactFlexItems(bodyItems) },
    ],
    footerContents: [
      {
        type: 'button',
        style: 'primary',
        height: 'sm',
        action: { type: 'uri', label: '詳細を見る', uri: buildLiffUrl(`/home/journals/${journal.id}`) },
      },
    ],
  });

  return { type: 'flex', altText: `${journalDate} - ${journal.dog_name}の日誌`, contents: bubble };
}

/**
 * 契約情報カードのFlexメッセージを作成
 */
export function createContractFlexMessage(contract: ContractData, calculatedRemaining: number | null): FlexMessage {
  const validUntil = formatSafeDate(contract.valid_until, '無期限');
  const priceLabel = contract.contract_type === '月謝制' ? '月額料金' : '料金';
  const price = contract.price ? Math.floor(contract.price).toLocaleString() : '-';

  const detailRows: Array<FlexComponent | null> = [
    { type: 'text', text: contract.course_name || contract.contract_type, weight: 'bold', size: 'md' },
    { type: 'text', text: `🐕 ${contract.dog_name}`, size: 'sm', color: '#666666' },
    { type: 'separator', margin: 'md' },
    createLabelValueRow('契約タイプ', contract.contract_type),
    createLabelValueRow(priceLabel, `¥${price}`, { valueBold: true }),
    contract.contract_type !== '月謝制' && calculatedRemaining !== null
      ? createLabelValueRow('残回数', `${calculatedRemaining}回`, {
          valueColor: calculatedRemaining > 0 ? '#10B981' : '#EF4444',
          valueBold: true,
        })
      : null,
    contract.contract_type === '月謝制' && contract.monthly_sessions
      ? createLabelValueRow('月間回数', `${contract.monthly_sessions}回`)
      : null,
    createLabelValueRow('有効期限', validUntil),
  ];

  const bubble = createHeaderBubble({
    headerText: '📋 契約情報',
    headerColor: '#8B5CF6',
    bodyContents: [
      { type: 'box', layout: 'vertical', spacing: 'sm', contents: compactFlexItems(detailRows) },
    ],
  });

  return {
    type: 'flex',
    altText: `${contract.dog_name} - ${contract.course_name || contract.contract_type}`,
    contents: bubble,
  };
}

/**
 * 予約リマインド用Flexメッセージを作成（登園前入力ボタン付き）
 */
export function createReservationReminderFlexMessage(reservation: {
  id: number;
  reservation_date: string;
  reservation_time: string;
  dog_name: string;
}): FlexMessage {
  const reservationDate = format(new Date(reservation.reservation_date), 'M月d日(E)', { locale: ja });
  const reservationTime = reservation.reservation_time.substring(0, 5);

  const bodyItems: FlexComponent[] = [
    createLabelValueRow('日時', `${reservationDate} ${reservationTime}`, { valueBold: true }),
    createLabelValueRow('ワンちゃん', reservation.dog_name),
    { type: 'separator', margin: 'md' },
    { type: 'text', text: '登園前に、体調や食事の情報をご入力ください。', size: 'xs', color: '#666666', wrap: true, margin: 'md' },
  ];

  const bubble = createHeaderBubble({
    headerText: '🔔 明日の登園予定',
    headerColor: '#F59E0B',
    bodyContents: [
      { type: 'box', layout: 'vertical', spacing: 'sm', contents: bodyItems },
    ],
    footerContents: [
      {
        type: 'button',
        style: 'primary',
        height: 'sm',
        action: { type: 'uri', label: '登園前情報を入力する', uri: buildLiffUrl(`/home/pre-visit/${reservation.id}`) },
        color: '#10B981',
      },
    ],
  });

  return {
    type: 'flex',
    altText: `【リマインド】${reservationDate} ${reservationTime} - ${reservation.dog_name}`,
    contents: bubble,
    quickReply: createQuickReply(),
  };
}

/**
 * 日誌更新通知用Flexメッセージを作成
 */
export function createJournalNotificationFlexMessage(journal: {
  id: number;
  journal_date: string;
  dog_name: string;
  comment?: string | null;
  photos?: string[] | null;
}): FlexMessage {
  const journalDate = format(new Date(journal.journal_date), 'M月d日(E)', { locale: ja });
  const commentPreview = journal.comment ? truncateText(journal.comment, 80) : null;
  const hasPhotos = journal.photos && journal.photos.length > 0;

  const bodyItems: Array<FlexComponent | null> = [
    createLabelValueRow('日付', journalDate, { valueBold: true }),
    createLabelValueRow('ワンちゃん', journal.dog_name),
    hasPhotos ? createLabelValueRow('写真', `📷 ${journal.photos!.length}枚`, { valueColor: '#10B981' }) : null,
    { type: 'separator', margin: 'md' },
    commentPreview
      ? { type: 'text', text: commentPreview, size: 'sm', color: '#333333', wrap: true, margin: 'md' }
      : { type: 'text', text: '今日の様子をアプリでご確認ください 🐾', size: 'sm', color: '#666666', wrap: true, margin: 'md' },
  ];

  const bubble = createHeaderBubble({
    headerText: '📝 今日の日誌が届きました',
    headerColor: '#3B82F6',
    bodyContents: [
      { type: 'box', layout: 'vertical', spacing: 'sm', contents: compactFlexItems(bodyItems) },
    ],
    footerContents: [
      {
        type: 'button',
        style: 'primary',
        height: 'sm',
        action: { type: 'uri', label: '日誌を見る', uri: buildLiffUrl(`/home/journals/${journal.id}`) },
      },
    ],
  });

  return {
    type: 'flex',
    altText: `📝 ${journal.dog_name}ちゃんの日誌が届きました`,
    contents: bubble,
    quickReply: createQuickReply(),
  };
}

/**
 * ワクチンアラート通知用Flexメッセージを作成
 */
export function createVaccineAlertFlexMessage(alert: {
  dog_name: string;
  alerts: string[];
  alert_days: number;
}): FlexMessage {
  const alertText = alert.alerts.join('・');

  const bodyItems: FlexComponent[] = [
    createLabelValueRow('ワンちゃん', alert.dog_name, { valueBold: true }),
    createLabelValueRow('対象', alertText, { valueColor: '#EF4444', valueBold: true }),
    { type: 'separator', margin: 'md' },
    {
      type: 'text',
      text: `${alert.alert_days}日以内に期限が切れます。\n早めの接種をお願いいたします。`,
      size: 'sm',
      color: '#666666',
      wrap: true,
      margin: 'md',
    },
  ];

  const bubble = createHeaderBubble({
    headerText: '⚠️ ワクチン期限のお知らせ',
    headerColor: '#EF4444',
    bodyContents: [
      { type: 'box', layout: 'vertical', spacing: 'sm', contents: bodyItems },
    ],
    footerContents: [
      {
        type: 'button',
        style: 'primary',
        height: 'sm',
        action: { type: 'uri', label: 'アプリで確認する', uri: buildLiffUrl('/home') },
        color: '#6B7280',
      },
    ],
  });

  return {
    type: 'flex',
    altText: `⚠️ ${alert.dog_name}ちゃんのワクチン期限が近づいています`,
    contents: bubble,
    quickReply: createQuickReply(),
  };
}

/**
 * ヘルプメッセージを作成
 */
export function createHelpMessage(): FlexMessage {
  const helpCommands: Array<{ emoji: string; command: string; description: string }> = [
    { emoji: '📅', command: '「予約確認」', description: '今後の予約一覧を表示' },
    { emoji: '📝', command: '「予約する」', description: '新規予約を作成' },
    { emoji: '❌', command: '「キャンセル」', description: '予約をキャンセル' },
    { emoji: '📖', command: '「日誌」「日報」', description: '日誌一覧を表示' },
    { emoji: '📋', command: '「契約」「残回数」', description: '契約情報と残回数を表示' },
  ];

  const commandItems: FlexComponent[] = helpCommands.flatMap((cmd) => [
    { type: 'text' as const, text: `${cmd.emoji} ${cmd.command}`, size: 'sm' as const, weight: 'bold' as const, margin: 'md' as const },
    { type: 'text' as const, text: cmd.description, size: 'xs' as const, color: '#666666', margin: 'xs' as const },
  ]);

  const bubble = createHeaderBubble({
    headerText: '❓ 使い方ガイド',
    headerColor: '#6366F1',
    bodyContents: [
      { type: 'text', text: '以下のコマンドで操作できます：', weight: 'bold', size: 'sm', margin: 'md' },
      { type: 'separator', margin: 'md' },
      { type: 'box', layout: 'vertical', spacing: 'sm', margin: 'md', contents: commandItems },
    ],
    footerContents: [
      {
        type: 'button',
        style: 'primary',
        height: 'sm',
        action: { type: 'uri', label: 'LIFFアプリを開く', uri: buildLiffUrl('/home') },
      },
    ],
  });

  return {
    type: 'flex',
    altText: '使い方ガイド',
    contents: bubble,
    quickReply: createQuickReply(),
  };
}
