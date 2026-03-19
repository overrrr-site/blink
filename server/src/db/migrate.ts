import pool from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    // 接続テスト
    await pool.query('SELECT 1');
    console.log('✅ データベース接続に成功しました');

    // 005_store_info.sqlを実行
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/005_store_info.sql'),
      'utf8'
    );
    
    await pool.query(migrationSQL);
    console.log('✅ マイグレーション 005_store_info.sql の実行が完了しました');
    
    process.exit(0);
  } catch (error: unknown) {
    const pgError = error as { code?: string; message?: string };
    if (pgError.code === '42701') {
      console.log('ℹ️  カラムは既に存在します');
      process.exit(0);
    } else {
      console.error('❌ マイグレーションの実行に失敗しました:', pgError.message);
      process.exit(1);
    }
  }
}

runMigration();
