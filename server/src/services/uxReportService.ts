import fs from 'fs/promises';
import path from 'path';
import pool from '../db/connection.js';
import { callGeminiText } from './ai/gemini.js';
import { getLatestClaritySnapshot, type ClaritySnapshot } from './clarityExportService.js';

type JobStatus = 'pending' | 'running' | 'done' | 'failed';

interface UxReportJobRow {
  id: number;
  store_id: number;
  status: JobStatus;
  session_count: number;
  session_ids: unknown;
}

interface UxEventRow {
  session_id: string;
  flow: 'reservation' | 'record';
  event_name: 'route_view' | 'cta_click' | 'form_error' | 'submit_success' | 'submit_fail' | 'api_slow';
  step: string;
  path: string;
  metadata: unknown;
  client_timestamp: string;
}

interface FrictionItem {
  title: string;
  count: number;
  rate: number;
  evidence: string;
}

interface ClarityUrlStat {
  url: string;
  totalSessionCount: number;
  rageClickCount: number;
  deadClickCount: number;
  quickBackClickCount: number;
  excessiveScrollCount: number;
  scriptErrorCount: number;
}

interface ClaritySummary {
  fetchedAt: string;
  numOfDays: number;
  dimensions: string[];
  topUrls: ClarityUrlStat[];
  focusUrls: ClarityUrlStat[];
}

const MAX_JOBS_PER_RUN = 3;

function parseSessionIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string' && value.length > 0);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parseSessionIds(parsed);
    } catch {
      return [];
    }
  }
  return [];
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function findValueByKeyHints(row: Record<string, unknown>, hints: string[]): number {
  const entries = Object.entries(row);
  for (const [key, value] of entries) {
    const normalized = key.toLowerCase().replace(/[\s_]/g, '');
    if (hints.some((hint) => normalized.includes(hint))) {
      const asNumber = toNumber(value);
      if (asNumber > 0) return asNumber;
    }
  }
  return 0;
}

function findUrlValue(row: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(row)) {
    const normalized = key.toLowerCase().replace(/[\s_]/g, '');
    if (normalized === 'url' || normalized.endsWith('url')) {
      const text = String(value ?? '').trim();
      if (text.length > 0) return text;
    }
  }
  return null;
}

function extractClarityUrlStats(snapshot: ClaritySnapshot): ClarityUrlStat[] {
  if (!Array.isArray(snapshot.payload)) return [];

  const byUrl = new Map<string, ClarityUrlStat>();
  const metrics = snapshot.payload as unknown[];

  for (const metric of metrics) {
    const metricObj = asObject(metric);
    const information = metricObj.information;
    if (!Array.isArray(information)) continue;

    for (const rawRow of information) {
      const row = asObject(rawRow);
      const url = findUrlValue(row);
      if (!url) continue;

      const current = byUrl.get(url) ?? {
        url,
        totalSessionCount: 0,
        rageClickCount: 0,
        deadClickCount: 0,
        quickBackClickCount: 0,
        excessiveScrollCount: 0,
        scriptErrorCount: 0,
      };

      current.totalSessionCount += findValueByKeyHints(row, ['totalsessioncount', 'sessioncount']);
      current.rageClickCount += findValueByKeyHints(row, ['rageclick']);
      current.deadClickCount += findValueByKeyHints(row, ['deadclick']);
      current.quickBackClickCount += findValueByKeyHints(row, ['quickbackclick', 'quickback']);
      current.excessiveScrollCount += findValueByKeyHints(row, ['excessivescroll']);
      current.scriptErrorCount += findValueByKeyHints(row, ['scripterror']);

      byUrl.set(url, current);
    }
  }

  return Array.from(byUrl.values())
    .sort((a, b) => b.totalSessionCount - a.totalSessionCount)
    .slice(0, 20);
}

function summarizeClaritySnapshot(snapshot: ClaritySnapshot | null): ClaritySummary | null {
  if (!snapshot) return null;

  const topUrls = extractClarityUrlStats(snapshot);
  const focusUrls = topUrls
    .filter((item) => item.url.includes('/reservations') || item.url.includes('/records'))
    .slice(0, 10);

  return {
    fetchedAt: snapshot.fetchedAt,
    numOfDays: snapshot.numOfDays,
    dimensions: [snapshot.dimension1, snapshot.dimension2, snapshot.dimension3]
      .filter((value): value is string => Boolean(value && value.trim().length > 0)),
    topUrls: topUrls.slice(0, 5),
    focusUrls,
  };
}

function increment(counter: Map<string, number>, key: string): void {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function topEntries(counter: Map<string, number>, limit: number): Array<[string, number]> {
  return Array.from(counter.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

function calculateFrictionItems(events: UxEventRow[], sessionCount: number): FrictionItem[] {
  const formErrorByStep = new Map<string, number>();
  const submitFailByFlow = new Map<string, number>();
  const slowApiByStep = new Map<string, number>();

  for (const event of events) {
    if (event.event_name === 'form_error') {
      increment(formErrorByStep, event.step);
    }
    if (event.event_name === 'submit_fail') {
      increment(submitFailByFlow, event.flow);
    }
    if (event.event_name === 'api_slow') {
      increment(slowApiByStep, event.step);
    }
  }

  const candidates: FrictionItem[] = [];
  for (const [step, count] of topEntries(formErrorByStep, 5)) {
    candidates.push({
      title: `入力エラーが多いステップ: ${step}`,
      count,
      rate: sessionCount > 0 ? (count / sessionCount) * 100 : 0,
      evidence: `event=form_error / step=${step}`,
    });
  }
  for (const [flow, count] of topEntries(submitFailByFlow, 3)) {
    candidates.push({
      title: `送信失敗が発生: ${flow}`,
      count,
      rate: sessionCount > 0 ? (count / sessionCount) * 100 : 0,
      evidence: `event=submit_fail / flow=${flow}`,
    });
  }
  for (const [step, count] of topEntries(slowApiByStep, 3)) {
    candidates.push({
      title: `低速処理が目立つステップ: ${step}`,
      count,
      rate: sessionCount > 0 ? (count / sessionCount) * 100 : 0,
      evidence: `event=api_slow / step=${step}`,
    });
  }

  return candidates
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function summarizeSessions(events: UxEventRow[], sessionIds: string[]): {
  successCount: number;
  failCount: number;
  flowBreakdown: Record<'reservation' | 'record', number>;
  ctaClickCount: number;
  formErrorCount: number;
  slowApiCount: number;
} {
  const terminalBySession = new Map<string, UxEventRow>();
  const flowBreakdown: Record<'reservation' | 'record', number> = { reservation: 0, record: 0 };
  let ctaClickCount = 0;
  let formErrorCount = 0;
  let slowApiCount = 0;

  for (const event of events) {
    if (event.event_name === 'cta_click') ctaClickCount += 1;
    if (event.event_name === 'form_error') formErrorCount += 1;
    if (event.event_name === 'api_slow') slowApiCount += 1;
    if (event.event_name === 'submit_success' || event.event_name === 'submit_fail') {
      terminalBySession.set(event.session_id, event);
    }
  }

  for (const sessionId of sessionIds) {
    const terminal = terminalBySession.get(sessionId);
    if (!terminal) continue;
    flowBreakdown[terminal.flow] += 1;
  }

  let successCount = 0;
  let failCount = 0;
  for (const terminal of terminalBySession.values()) {
    if (terminal.event_name === 'submit_success') successCount += 1;
    if (terminal.event_name === 'submit_fail') failCount += 1;
  }

  return {
    successCount,
    failCount,
    flowBreakdown,
    ctaClickCount,
    formErrorCount,
    slowApiCount,
  };
}

function heuristicImprovements(frictionItems: FrictionItem[]): string[] {
  if (frictionItems.length === 0) {
    return [
      'セッション量が少ないため、次回は入力項目ごとの必須/任意の区別をイベントで追加してください。',
      'submit_fail時にHTTPステータスやAPI名（PIIなし）をmetaへ残すと、改善の優先順位が上げやすくなります。',
      'route_viewからsubmit_successまでの経過秒数を送信すると、完了時間のベンチマークが可能になります。',
    ];
  }

  return frictionItems.map((item, index) => {
    const priority = index === 0 ? '高' : index === 1 ? '中' : '低';
    const effort = index === 0 ? '中' : '小';
    return `優先度${priority}: ${item.title}（想定工数: ${effort}） - 根拠: ${item.evidence}`;
  });
}

async function generateAiProposal(summary: {
  sessionCount: number;
  successCount: number;
  failCount: number;
  flowBreakdown: Record<'reservation' | 'record', number>;
  frictionItems: FrictionItem[];
  claritySummary: ClaritySummary | null;
}): Promise<string[] | null> {
  const clarityForPrompt = summary.claritySummary
    ? {
      fetchedAt: summary.claritySummary.fetchedAt,
      topUrls: summary.claritySummary.topUrls,
      focusUrls: summary.claritySummary.focusUrls.slice(0, 5),
    }
    : null;

  const prompt = [
    'あなたはSaaSのUX改善アナリストです。',
    '以下の数値をもとに、改善案を3件だけ日本語で出してください。',
    '出力フォーマット: 箇条書き3行。各行に「優先度」「影響」「工数」を含める。',
    `セッション数: ${summary.sessionCount}`,
    `成功: ${summary.successCount}, 失敗: ${summary.failCount}`,
    `導線内訳: reservation=${summary.flowBreakdown.reservation}, record=${summary.flowBreakdown.record}`,
    `friction: ${JSON.stringify(summary.frictionItems)}`,
    `clarity: ${JSON.stringify(clarityForPrompt)}`,
  ].join('\n');

  try {
    const text = await callGeminiText({
      prompt,
      model: 'gemini-2.0-flash',
      maxOutputTokens: 600,
      temperature: 0.3,
      thinkingBudget: 0,
    });
    if (!text) return null;
    const lines = text
      .split('\n')
      .map((line) => line.replace(/^\s*[-*・]\s*/, '').trim())
      .filter((line) => line.length > 0);
    return lines.slice(0, 3);
  } catch {
    return null;
  }
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function resolveReportDir(): string {
  const configured = process.env.UX_REPORT_DIR?.trim();
  if (!configured) {
    return path.resolve(process.cwd(), 'docs', 'ux-reports');
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(process.cwd(), configured);
}

function buildReportFilename(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}_${hh}-${min}_ux-report.md`;
}

function buildReportMarkdown(input: {
  generatedAt: Date;
  storeId: number;
  sessionIds: string[];
  summary: ReturnType<typeof summarizeSessions>;
  frictionItems: FrictionItem[];
  claritySummary: ClaritySummary | null;
  improvements: string[];
  eventSamples: UxEventRow[];
}): string {
  const lines: string[] = [];
  lines.push(`# UX改善レポート (${input.generatedAt.toISOString()})`);
  lines.push('');
  lines.push(`- store_id: ${input.storeId}`);
  lines.push(`- 対象セッション数: ${input.sessionIds.length}`);
  lines.push(`- 成功: ${input.summary.successCount} / 失敗: ${input.summary.failCount}`);
  lines.push(`- 導線内訳: 予約=${input.summary.flowBreakdown.reservation} / カルテ=${input.summary.flowBreakdown.record}`);
  lines.push('');
  lines.push('## Top Friction 3');
  if (input.frictionItems.length === 0) {
    lines.push('- 目立ったfrictionイベントは検出されませんでした。');
  } else {
    for (const item of input.frictionItems) {
      lines.push(`- ${item.title}（${item.count}件 / ${formatPercent(item.rate)}）`);
      lines.push(`  - 根拠: ${item.evidence}`);
    }
  }
  lines.push('');
  lines.push('## Clarity Raw Data');
  if (!input.claritySummary) {
    lines.push('- Clarityデータは未同期です（`CLARITY_EXPORT_API_TOKEN`未設定、または同期未実行）。');
  } else {
    lines.push('- このセクションはClarityプロジェクト全体の集計データです。');
    lines.push(`- 取得時刻: ${input.claritySummary.fetchedAt}`);
    lines.push(`- 集計期間(日): ${input.claritySummary.numOfDays}`);
    lines.push(`- 次元: ${input.claritySummary.dimensions.join(' / ') || '未設定'}`);
    if (input.claritySummary.topUrls.length > 0) {
      lines.push('- 全体Top URL:');
      for (const item of input.claritySummary.topUrls) {
        lines.push(
          `  - ${item.url} | sessions=${item.totalSessionCount} | rage=${item.rageClickCount} | dead=${item.deadClickCount} | quickback=${item.quickBackClickCount} | scroll=${item.excessiveScrollCount} | script_error=${item.scriptErrorCount}`,
        );
      }
    }
    if (input.claritySummary.focusUrls.length > 0) {
      lines.push('- 予約・カルテ関連URL:');
      for (const item of input.claritySummary.focusUrls.slice(0, 5)) {
        lines.push(
          `  - ${item.url} | sessions=${item.totalSessionCount} | rage=${item.rageClickCount} | dead=${item.deadClickCount}`,
        );
      }
    }
  }
  lines.push('');
  lines.push('## 改善提案');
  for (const suggestion of input.improvements) {
    lines.push(`- ${suggestion}`);
  }
  lines.push('');
  lines.push('## 次に追加すべき計測');
  lines.push('- submit_fail時に `meta.error_code`（PIIなし）を追加');
  lines.push('- ステップ遷移ごとに `meta.from_step` / `meta.to_step` を追加');
  lines.push('- 送信完了までの秒数 `meta.elapsed_ms` を追加');
  lines.push('');
  lines.push('## 代表イベント（先頭20件）');
  for (const event of input.eventSamples.slice(0, 20)) {
    const meta = asObject(event.metadata);
    const metaJson = JSON.stringify(meta);
    lines.push(`- ${event.client_timestamp} | ${event.flow} | ${event.event_name} | ${event.step} | ${event.path} | meta=${metaJson}`);
  }
  lines.push('');
  lines.push('## 対象セッションID');
  for (const sessionId of input.sessionIds) {
    lines.push(`- ${sessionId}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function claimPendingJob(): Promise<UxReportJobRow | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const claimResult = await client.query<UxReportJobRow>(
      `WITH next_job AS (
         SELECT id
         FROM ux_report_jobs
         WHERE status = 'pending'
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE ux_report_jobs j
       SET status = 'running',
           started_at = NOW(),
           updated_at = NOW()
       FROM next_job
       WHERE j.id = next_job.id
       RETURNING j.*`,
    );
    await client.query('COMMIT');
    return claimResult.rows[0] ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function markJobDone(params: {
  jobId: number;
  outputPath: string;
  summary: Record<string, unknown>;
}): Promise<void> {
  await pool.query(
    `UPDATE ux_report_jobs
     SET status = 'done',
         output_path = $2,
         summary = $3::jsonb,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [params.jobId, params.outputPath, JSON.stringify(params.summary)],
  );
}

async function markJobFailed(jobId: number, errorMessage: string): Promise<void> {
  await pool.query(
    `UPDATE ux_report_jobs
     SET status = 'failed',
         error_message = $2,
         completed_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, errorMessage.slice(0, 1000)],
  );
}

async function processOneJob(job: UxReportJobRow): Promise<string> {
  const sessionIds = parseSessionIds(job.session_ids);
  if (sessionIds.length === 0) {
    throw new Error('セッションIDが空です');
  }

  const eventsResult = await pool.query<UxEventRow>(
    `SELECT
       session_id,
       flow,
       event_name,
       step,
       path,
       metadata,
       client_timestamp
     FROM ux_events
     WHERE report_job_id = $1
     ORDER BY client_timestamp ASC, created_at ASC`,
    [job.id],
  );
  const events = eventsResult.rows;
  const summary = summarizeSessions(events, sessionIds);
  const frictionItems = calculateFrictionItems(events, sessionIds.length);
  const claritySnapshot = await getLatestClaritySnapshot();
  const claritySummary = summarizeClaritySnapshot(claritySnapshot);
  const aiSuggestions = await generateAiProposal({
    sessionCount: sessionIds.length,
    successCount: summary.successCount,
    failCount: summary.failCount,
    flowBreakdown: summary.flowBreakdown,
    frictionItems,
    claritySummary,
  });
  const improvements = aiSuggestions ?? heuristicImprovements(frictionItems);
  const generatedAt = new Date();
  const reportBody = buildReportMarkdown({
    generatedAt,
    storeId: job.store_id,
    sessionIds,
    summary,
    frictionItems,
    claritySummary,
    improvements,
    eventSamples: events,
  });

  const reportDir = resolveReportDir();
  await fs.mkdir(reportDir, { recursive: true });
  const filename = buildReportFilename(generatedAt);
  const outputPath = path.join(reportDir, filename);
  await fs.writeFile(outputPath, reportBody, 'utf8');

  await markJobDone({
    jobId: job.id,
    outputPath,
    summary: {
      session_count: sessionIds.length,
      success_count: summary.successCount,
      fail_count: summary.failCount,
      friction_items: frictionItems,
      clarity_fetched_at: claritySummary?.fetchedAt ?? null,
    },
  });

  return outputPath;
}

export async function processPendingUxReportJobs(limit = MAX_JOBS_PER_RUN): Promise<{
  processed: number;
  failed: number;
  outputPaths: string[];
}> {
  let processed = 0;
  let failed = 0;
  const outputPaths: string[] = [];

  for (let i = 0; i < limit; i += 1) {
    const job = await claimPendingJob();
    if (!job) break;

    try {
      const outputPath = await processOneJob(job);
      processed += 1;
      outputPaths.push(outputPath);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'unknown error';
      await markJobFailed(job.id, message);
    }
  }

  return { processed, failed, outputPaths };
}
