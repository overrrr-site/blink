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
