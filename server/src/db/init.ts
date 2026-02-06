import pool from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALREADY_EXISTS_CODES = new Set(['42P07', '42701']);

const MIGRATIONS = [
  { file: '001_initial_schema.sql',                  label: '初期スキーマ' },
  { file: '002_google_calendar.sql',                 label: 'Googleカレンダー連携スキーマ' },
  { file: '003_contracts_and_makeup_tickets.sql',     label: '契約・振替チケットスキーマ' },
  { file: '004_multi_dog_discount_and_settings.sql',  label: '多頭割引・設定スキーマ' },
  { file: '005_store_info.sql',                       label: '店舗基本情報拡張スキーマ' },
  { file: '006_audit_log_and_soft_delete.sql',        label: '閲覧ログ・論理削除スキーマ' },
  { file: '007_notifications.sql',                    label: '通知機能スキーマ' },
  { file: '008_billing.sql',                          label: '決済機能スキーマ' },
  { file: '009_supabase_auth.sql',                    label: 'Supabase認証スキーマ' },
  { file: '010_line_multitenant.sql',                 label: 'LINEマルチテナントスキーマ' },
  { file: '011_inspection_records.sql',               label: '検査記録スキーマ' },
  { file: '012_line_link_codes.sql',                  label: 'LINE連携コードスキーマ' },
  { file: '013_line_bot_enabled.sql',                 label: 'LINEボット有効化スキーマ' },
  { file: '014_checkout_and_status.sql',              label: 'チェックアウト・ステータススキーマ' },
  { file: '015_announcements.sql',                    label: 'お知らせスキーマ' },
  { file: '016_performance_indexes.sql',              label: 'パフォーマンスインデックス' },
  { file: '017_rename_checkout_status.sql',           label: 'チェックアウトステータスリネーム' },
  { file: '018_dashboard_performance_indexes.sql',    label: 'ダッシュボードインデックス' },
  { file: '019_additional_performance_indexes.sql',   label: '追加インデックス' },
  { file: '020_meal_records.sql',                     label: '食事記録スキーマ' },
  { file: '021_rls_security.sql',                     label: 'RLSセキュリティスキーマ' },
  { file: '022_alert_query_index.sql',                label: 'アラートクエリインデックス' },
  { file: '023_business_types.sql',                   label: '業種設定スキーマ' },
  { file: '024_reservations_service_type.sql',        label: '予約サービス種別スキーマ' },
  { file: '025_records_table.sql',                    label: 'カルテテーブルスキーマ' },
  { file: '026_onboarding_completed.sql',             label: 'オンボーディング完了フラグ' },
  { file: '027_store_settings_ai.sql',                label: 'AI設定フラグ' },
  { file: '028_staff_assigned_business_types.sql',    label: 'スタッフ業種割り当て' },
  { file: '029_business_type_settings.sql',           label: '業種別設定・マスタ' },
  { file: '030_ai_learning_data.sql',                 label: 'AI学習データ' },
  { file: '031_integrity_and_indexes.sql',            label: '整合性制約・補助インデックス' },
] as const;

async function runMigration(file: string, label: string): Promise<void> {
  const sql = fs.readFileSync(path.join(__dirname, 'migrations', file), 'utf8');

  try {
    await pool.query(sql);
    console.log(`✅ ${label}の作成が完了しました`);
  } catch (error: unknown) {
    const pgError = error as { code?: string; message?: string };
    if (pgError.code && ALREADY_EXISTS_CODES.has(pgError.code)) {
      console.log(`ℹ️  ${label}は既に存在します`);
    } else {
      console.error(`⚠️  ${label}の作成に失敗:`, pgError.message);
    }
  }
}

export async function initializeDatabase(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    console.log('✅ データベース接続に成功しました');

    if (process.env.SUPABASE_URL) {
      console.log('ℹ️  Supabaseを使用しています。マイグレーションはSupabaseダッシュボードのSQL Editorで実行してください');
      console.log('ℹ️  ファイル: server/src/db/migrations/supabase_migration.sql');
      return;
    }

    console.log('ℹ️  ローカルPostgreSQLを使用しています。スキーマを初期化します...');

    for (const { file, label } of MIGRATIONS) {
      await runMigration(file, label);
    }

    console.log('✅ データベーススキーマの初期化が完了しました');
  } catch (error: unknown) {
    const pgError = error as { code?: string; message?: string };
    console.error('❌ データベーススキーマの初期化に失敗しました:', pgError.message);
  }
}
