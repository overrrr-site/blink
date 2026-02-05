import { supabase } from '../db/supabase.js';
import path from 'path';
import { randomUUID } from 'crypto';

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Supabaseクライアントが初期化されているか確認し、未初期化ならnullを返す
 */
function requireSupabase(): NonNullable<typeof supabase> | null {
  if (!supabase) {
    console.error('Supabaseクライアントが初期化されていません');
    return null;
  }
  return supabase;
}

/**
 * バッファをStorageにアップロードし、公開URLとパスを返す共通処理
 */
async function uploadBuffer(
  buffer: Buffer,
  filePath: string,
  contentType: string
): Promise<{ url: string; path: string } | null> {
  const client = requireSupabase();
  if (!client) return null;

  try {
    const { error } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, { contentType, upsert: false });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return null;
    }

    const { data: urlData } = client.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, path: filePath };
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    return null;
  }
}

/**
 * カテゴリとファイル拡張子からユニークなファイルパスを生成する
 */
function buildFilePath(category: string, ext: string): string {
  return `${category}/${randomUUID()}${ext}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Supabase Storageが利用可能かどうかを確認
 */
export function isSupabaseStorageAvailable(): boolean {
  return supabase !== null
    && !!process.env.SUPABASE_URL
    && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Multerファイルを Supabase Storageにアップロード
 */
export async function uploadToSupabaseStorage(
  file: Express.Multer.File,
  category: string = 'general'
): Promise<{ url: string; path: string } | null> {
  const ext = path.extname(file.originalname);
  const filePath = buildFilePath(category, ext);
  return uploadBuffer(file.buffer, filePath, file.mimetype);
}

/**
 * 複数のMulterファイルをSupabase Storageにアップロード
 */
export async function uploadMultipleToSupabaseStorage(
  files: Express.Multer.File[],
  category: string = 'general'
): Promise<Array<{ url: string; path: string; originalname: string; mimetype: string; size: number }>> {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const result = await uploadToSupabaseStorage(file, category);
      if (!result) return null;
      return { ...result, originalname: file.originalname, mimetype: file.mimetype, size: file.size };
    })
  );

  return uploads.filter(
    (upload): upload is { url: string; path: string; originalname: string; mimetype: string; size: number } =>
      upload !== null
  );
}

/**
 * Base64データをSupabase Storageにアップロード
 */
export async function uploadBase64ToSupabaseStorage(
  base64Data: string,
  category: string = 'journals'
): Promise<{ url: string; path: string } | null> {
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    console.error('無効なBase64データ形式です');
    return null;
  }

  const mimeType = matches[1];
  const ext = MIME_TO_EXT[mimeType] || '.jpg';
  const buffer = Buffer.from(matches[2], 'base64');
  const filePath = buildFilePath(category, ext);

  return uploadBuffer(buffer, filePath, mimeType);
}

/**
 * 複数のBase64画像をSupabase Storageにアップロード
 */
export async function uploadMultipleBase64ToSupabaseStorage(
  base64DataArray: string[],
  category: string = 'journals'
): Promise<string[]> {
  const uploads = await Promise.all(
    base64DataArray.map(async (base64Data) => {
      const result = await uploadBase64ToSupabaseStorage(base64Data, category);
      return result?.url ?? null;
    })
  );

  return uploads.filter((url): url is string => url !== null);
}

/**
 * Supabase Storageからファイルを削除
 */
export async function deleteFromSupabaseStorage(fileUrl: string): Promise<boolean> {
  const client = requireSupabase();
  if (!client) return false;

  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(STORAGE_BUCKET);

    if (bucketIndex === -1) {
      console.error('無効なファイルURL:', fileUrl);
      return false;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');
    const { error } = await client.storage.from(STORAGE_BUCKET).remove([filePath]);

    if (error) {
      console.error('Supabase Storage delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting from Supabase Storage:', error);
    return false;
  }
}

/**
 * Supabase Storageバケットの初期化（存在しない場合は作成）
 */
export async function initializeStorageBucket(): Promise<boolean> {
  const client = requireSupabase();
  if (!client) {
    console.log('Supabase Storage: ローカルファイルシステムを使用します');
    return false;
  }

  try {
    const { data: buckets, error: listError } = await client.storage.listBuckets();

    if (listError) {
      console.error('バケット一覧の取得に失敗:', listError);
      return false;
    }

    const bucketExists = buckets?.some((b) => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      const { error: createError } = await client.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
      });

      if (createError && !createError.message?.includes('already exists')) {
        console.error('バケット作成に失敗:', createError);
        return false;
      }
      if (!createError) {
        console.log(`Supabase Storageバケット '${STORAGE_BUCKET}' を作成しました`);
      }
    }

    console.log(`Supabase Storage: バケット '${STORAGE_BUCKET}' を使用します`);
    return true;
  } catch (error) {
    console.error('Supabase Storage初期化エラー:', error);
    return false;
  }
}
