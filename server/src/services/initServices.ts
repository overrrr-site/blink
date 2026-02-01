import { initializeEmailClient } from './emailService.js';
import { initializeStorageBucket } from './storageService.js';

/**
 * アプリケーション起動時に必要な外部サービスを初期化する。
 * - Resend メールクライアント
 * - Supabase Storage バケット
 */
export async function initializeServices(): Promise<void> {
  initializeEmailClient();

  console.log('LINE Messaging APIはマルチテナント対応（店舗ごとの認証情報を使用）');

  await initializeStorageBucket();
}
