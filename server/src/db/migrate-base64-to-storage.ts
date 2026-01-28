/**
 * 日誌の写真をBase64からSupabase Storageに移行するスクリプト
 *
 * 使用方法:
 *   npx ts-node src/db/migrate-base64-to-storage.ts
 *
 * または:
 *   npm run migrate:photos
 */

import dotenv from 'dotenv';
dotenv.config();

import pool from './connection.js';
import {
  uploadBase64ToSupabaseStorage,
  isSupabaseStorageAvailable,
} from '../services/storageService.js';

interface JournalRow {
  id: number;
  photos: string[] | null;
}

async function migratePhotos() {
  console.log('===========================================');
  console.log('Base64 → Supabase Storage 移行スクリプト');
  console.log('===========================================\n');

  // Supabase Storageの確認
  if (!isSupabaseStorageAvailable()) {
    console.error('❌ Supabase Storageが利用できません。');
    console.error('   環境変数を確認してください:');
    console.error('   - SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('   - SUPABASE_STORAGE_BUCKET');
    process.exit(1);
  }

  console.log('✅ Supabase Storage接続OK\n');

  try {
    // Base64画像を含む日誌を取得
    const result = await pool.query<JournalRow>(`
      SELECT id, photos
      FROM journals
      WHERE photos IS NOT NULL
      ORDER BY id
    `);

    const journals = result.rows;
    console.log(`📋 対象の日誌: ${journals.length}件\n`);

    let totalPhotos = 0;
    let migratedPhotos = 0;
    let skippedPhotos = 0;
    let failedPhotos = 0;
    let updatedJournals = 0;

    for (const journal of journals) {
      if (!journal.photos || !Array.isArray(journal.photos)) {
        continue;
      }

      const photos = journal.photos;
      const newPhotos: string[] = [];
      let hasBase64 = false;

      for (const photo of photos) {
        totalPhotos++;

        // 既にURLの場合はそのまま
        if (photo.startsWith('http')) {
          newPhotos.push(photo);
          skippedPhotos++;
          continue;
        }

        // Base64データの場合は移行
        if (photo.startsWith('data:image/')) {
          hasBase64 = true;
          console.log(`  📤 日誌ID ${journal.id}: Base64画像をアップロード中...`);

          const uploadResult = await uploadBase64ToSupabaseStorage(photo, 'journals');

          if (uploadResult) {
            newPhotos.push(uploadResult.url);
            migratedPhotos++;
            console.log(`     ✅ 成功: ${uploadResult.url.substring(0, 80)}...`);
          } else {
            // アップロード失敗時は元のデータを保持
            newPhotos.push(photo);
            failedPhotos++;
            console.log(`     ❌ 失敗: アップロードエラー`);
          }
        } else {
          // 不明な形式はそのまま保持
          newPhotos.push(photo);
          skippedPhotos++;
        }
      }

      // Base64があった場合のみDBを更新
      if (hasBase64) {
        await pool.query(
          `UPDATE journals SET photos = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
          [JSON.stringify(newPhotos), journal.id]
        );
        updatedJournals++;
        console.log(`  💾 日誌ID ${journal.id}: DB更新完了\n`);
      }
    }

    console.log('\n===========================================');
    console.log('移行完了');
    console.log('===========================================');
    console.log(`📊 統計:`);
    console.log(`   - 処理した写真総数: ${totalPhotos}`);
    console.log(`   - 移行成功: ${migratedPhotos}`);
    console.log(`   - スキップ（既にURL）: ${skippedPhotos}`);
    console.log(`   - 失敗: ${failedPhotos}`);
    console.log(`   - 更新した日誌: ${updatedJournals}`);

    if (failedPhotos > 0) {
      console.log('\n⚠️  一部の画像の移行に失敗しました。');
      console.log('   失敗した画像は元のBase64データのまま保持されています。');
      console.log('   再度スクリプトを実行することで再試行できます。');
    }
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 実行
migratePhotos();
