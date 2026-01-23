import pool from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 マイグレーションを実行します...\n');

    // 接続テスト
    await pool.query('SELECT 1');
    console.log('✅ データベース接続に成功しました\n');

    // マイグレーションファイルを読み込んで実行
    const migrationFile = path.join(__dirname, 'migrations/006_audit_log_and_soft_delete.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    console.log('📄 マイグレーションファイル: 006_audit_log_and_soft_delete.sql');
    console.log('⏳ SQLを実行中...\n');

    // SQLを実行（セミコロンで分割して実行）
    // コメント行を除去し、空行を無視
    const lines = sql.split('\n');
    let currentStatement = '';
    const statements: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // コメント行をスキップ
      if (trimmed.startsWith('--') || trimmed === '') {
        continue;
      }
      currentStatement += line + '\n';
      // セミコロンで終わる場合はステートメントとして追加
      if (trimmed.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    // 最後のステートメントが残っている場合
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
          console.log(`✅ 実行完了: ${preview}...`);
        } catch (error: any) {
          // 既に存在する場合はスキップ
          if (error.code === '42P07' || error.code === '42701' || error.code === '42P16') {
            const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
            console.log(`ℹ️  スキップ (既に存在): ${preview}...`);
          } else {
            const preview = statement.replace(/\s+/g, ' ').substring(0, 100);
            console.error(`❌ エラー: ${error.message}`);
            console.error(`   SQL: ${preview}...`);
          }
        }
      }
    }

    console.log('\n✅ マイグレーションが完了しました！');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ マイグレーション実行エラー:', error.message);
    process.exit(1);
  }
}

runMigration();
