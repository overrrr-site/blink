import pool from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  try {
    // 接続テスト
    await pool.query('SELECT 1');
    console.log('✅ データベース接続に成功しました');

    // Supabaseを使用する場合、マイグレーションはSupabaseダッシュボードで実行
    if (process.env.SUPABASE_URL) {
      console.log('ℹ️  Supabaseを使用しています。マイグレーションはSupabaseダッシュボードのSQL Editorで実行してください');
      console.log('ℹ️  ファイル: server/src/db/migrations/supabase_migration.sql');
      return;
    }
    
    // ローカル開発用（PostgreSQL直接接続）
    console.log('ℹ️  ローカルPostgreSQLを使用しています。スキーマを初期化します...');
    
    // 初期スキーマ
    const initialSchema = fs.readFileSync(
      path.join(__dirname, 'migrations/001_initial_schema.sql'),
      'utf8'
    );
    await pool.query(initialSchema);
    console.log('✅ 初期スキーマの作成が完了しました');

    // Googleカレンダー連携スキーマ
    try {
      const googleCalendarSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/002_google_calendar.sql'),
        'utf8'
      );
      await pool.query(googleCalendarSchema);
      console.log('✅ Googleカレンダー連携スキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('ℹ️  Googleカレンダー連携テーブルは既に存在します');
      } else {
        console.error('⚠️  Googleカレンダー連携スキーマの作成に失敗:', error.message);
      }
    }

    // 契約・振替チケットスキーマ
    try {
      const contractsSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/003_contracts_and_makeup_tickets.sql'),
        'utf8'
      );
      await pool.query(contractsSchema);
      console.log('✅ 契約・振替チケットスキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42P07') {
        console.log('ℹ️  契約・振替チケットテーブルは既に存在します');
      } else {
        console.error('⚠️  契約・振替チケットスキーマの作成に失敗:', error.message);
      }
    }

    // 多頭割引・設定スキーマ
    try {
      const settingsSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/004_multi_dog_discount_and_settings.sql'),
        'utf8'
      );
      await pool.query(settingsSchema);
      console.log('✅ 多頭割引・設定スキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42P07' || error.code === '42701') {
        console.log('ℹ️  多頭割引・設定テーブルは既に存在します');
      } else {
        console.error('⚠️  多頭割引・設定スキーマの作成に失敗:', error.message);
      }
    }

    // 店舗基本情報拡張スキーマ
    try {
      const storeInfoSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/005_store_info.sql'),
        'utf8'
      );
      await pool.query(storeInfoSchema);
      console.log('✅ 店舗基本情報拡張スキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42701') {
        console.log('ℹ️  店舗基本情報カラムは既に存在します');
      } else {
        console.error('⚠️  店舗基本情報拡張スキーマの作成に失敗:', error.message);
      }
    }

    // 閲覧ログ・論理削除スキーマ
    try {
      const auditLogSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/006_audit_log_and_soft_delete.sql'),
        'utf8'
      );
      await pool.query(auditLogSchema);
      console.log('✅ 閲覧ログ・論理削除スキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42701' || error.code === '42P07') {
        console.log('ℹ️  閲覧ログ・論理削除テーブルは既に存在します');
      } else {
        console.error('⚠️  閲覧ログ・論理削除スキーマの作成に失敗:', error.message);
      }
    }

    // 通知機能スキーマ
    try {
      const notificationSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/007_notifications.sql'),
        'utf8'
      );
      await pool.query(notificationSchema);
      console.log('✅ 通知機能スキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42701' || error.code === '42P07') {
        console.log('ℹ️  通知機能テーブルは既に存在します');
      } else {
        console.error('⚠️  通知機能スキーマの作成に失敗:', error.message);
      }
    }

    // 決済機能スキーマ
    try {
      const billingSchema = fs.readFileSync(
        path.join(__dirname, 'migrations/008_billing.sql'),
        'utf8'
      );
      await pool.query(billingSchema);
      console.log('✅ 決済機能スキーマの作成が完了しました');
    } catch (error: any) {
      if (error.code === '42701' || error.code === '42P07') {
        console.log('ℹ️  決済機能テーブルは既に存在します');
      } else {
        console.error('⚠️  決済機能スキーマの作成に失敗:', error.message);
      }
    }
    
    console.log('✅ データベーススキーマの初期化が完了しました');
  } catch (error: any) {
    // テーブルが既に存在する場合はエラーを無視
    if (error.code === '42P07') {
      console.log('ℹ️  テーブルは既に存在します');
      return;
    }
    console.error('❌ データベーススキーマの初期化に失敗しました:', error.message);
    // 初期化エラーは致命的ではないので、続行
  }
}
