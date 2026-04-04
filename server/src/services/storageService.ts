import { supabase } from '../db/supabase.js';
import path from 'path';
import { randomUUID } from 'crypto';

const PUBLIC_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';
const PRIVATE_STORAGE_BUCKET = process.env.SUPABASE_PRIVATE_STORAGE_BUCKET || 'secure-uploads';
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const PRIVATE_FILE_REF_PREFIX = 'private:';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

export type StorageVisibility = 'public' | 'private';

type StoredFileReference = {
  bucket: string;
  path: string;
  visibility: StorageVisibility;
};

type UploadResult = {
  url: string;
  path: string;
  accessUrl?: string;
};

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

function getBucketForVisibility(visibility: StorageVisibility): string {
  return visibility === 'private' ? PRIVATE_STORAGE_BUCKET : PUBLIC_STORAGE_BUCKET;
}

function createPrivateFileRef(bucket: string, filePath: string): string {
  return `${PRIVATE_FILE_REF_PREFIX}${bucket}:${filePath}`;
}

function parsePublicStorageUrl(fileUrl: string): StoredFileReference | null {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const objectIndex = pathParts.findIndex((part) => part === 'object');
    if (objectIndex === -1) return null;

    const visibility = pathParts[objectIndex + 1];
    const bucket = pathParts[objectIndex + 2];
    const filePath = pathParts.slice(objectIndex + 3).join('/');

    if (!bucket || !filePath || visibility !== 'public') {
      return null;
    }

    return {
      bucket,
      path: filePath,
      visibility: 'public',
    };
  } catch {
    return null;
  }
}

function parseStoredFileReference(fileReference: string): StoredFileReference | null {
  if (!fileReference) {
    return null;
  }

  if (fileReference.startsWith(PRIVATE_FILE_REF_PREFIX)) {
    const payload = fileReference.slice(PRIVATE_FILE_REF_PREFIX.length);
    const separatorIndex = payload.indexOf(':');
    if (separatorIndex <= 0) {
      return null;
    }

    const bucket = payload.slice(0, separatorIndex);
    const filePath = payload.slice(separatorIndex + 1);
    if (!bucket || !filePath) {
      return null;
    }

    return {
      bucket,
      path: filePath,
      visibility: 'private',
    };
  }

  if (fileReference.startsWith('http')) {
    return parsePublicStorageUrl(fileReference);
  }

  return null;
}

function isStoreScopedPath(filePath: string, storeId: number): boolean {
  return filePath.startsWith(`stores/${storeId}/`);
}

async function createSignedAccessUrl(
  client: NonNullable<typeof supabase>,
  bucket: string,
  filePath: string,
  expiresInSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(filePath, expiresInSeconds);

  if (error) {
    console.error('Supabase signed URL creation error:', error);
    return null;
  }

  return data.signedUrl;
}

/**
 * バッファをStorageにアップロードし、参照情報を返す共通処理
 */
async function uploadBuffer(
  buffer: Buffer,
  filePath: string,
  contentType: string,
  visibility: StorageVisibility,
): Promise<UploadResult | null> {
  const client = requireSupabase();
  if (!client) return null;

  const bucket = getBucketForVisibility(visibility);

  try {
    const { error } = await client.storage
      .from(bucket)
      .upload(filePath, buffer, { contentType, upsert: false });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return null;
    }

    if (visibility === 'private') {
      const accessUrl = await createSignedAccessUrl(client, bucket, filePath);
      return {
        url: createPrivateFileRef(bucket, filePath),
        path: filePath,
        accessUrl: accessUrl ?? undefined,
      };
    }

    const { data: urlData } = client.storage
      .from(bucket)
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
function buildFilePath(category: string, ext: string, storeId?: number): string {
  if (typeof storeId === 'number' && Number.isInteger(storeId) && storeId > 0) {
    return `stores/${storeId}/${category}/${randomUUID()}${ext}`;
  }

  return `${category}/${randomUUID()}${ext}`;
}

/**
 * Supabase Storageが利用可能かどうかを確認
 */
export function isSupabaseStorageAvailable(): boolean {
  return supabase !== null
    && !!process.env.SUPABASE_URL
    && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function isPrivateStorageReference(fileReference: string): boolean {
  return fileReference.startsWith(PRIVATE_FILE_REF_PREFIX);
}

export async function createSignedFileUrl(
  fileReference: string,
  expiresInSeconds: number = SIGNED_URL_TTL_SECONDS,
): Promise<string | null> {
  const parsed = parseStoredFileReference(fileReference);
  if (!parsed) {
    return fileReference.startsWith('http') ? fileReference : null;
  }

  if (parsed.visibility === 'public') {
    return fileReference;
  }

  const client = requireSupabase();
  if (!client) return null;

  return createSignedAccessUrl(client, parsed.bucket, parsed.path, expiresInSeconds);
}

/**
 * Multerファイルを Supabase Storageにアップロード
 */
export async function uploadToSupabaseStorage(
  file: Express.Multer.File,
  options: {
    category?: string;
    storeId?: number;
    visibility?: StorageVisibility;
  } = {},
): Promise<UploadResult | null> {
  const ext = path.extname(file.originalname);
  const visibility = options.visibility ?? 'public';
  const filePath = buildFilePath(options.category ?? 'general', ext, options.storeId);
  return uploadBuffer(file.buffer, filePath, file.mimetype, visibility);
}

/**
 * 複数のMulterファイルをSupabase Storageにアップロード
 */
export async function uploadMultipleToSupabaseStorage(
  files: Express.Multer.File[],
  options: {
    category?: string;
    storeId?: number;
    visibility?: StorageVisibility;
  } = {},
): Promise<Array<UploadResult & { originalname: string; mimetype: string; size: number }>> {
  const uploads = await Promise.all(
    files.map(async (file) => {
      const result = await uploadToSupabaseStorage(file, options);
      if (!result) return null;
      return { ...result, originalname: file.originalname, mimetype: file.mimetype, size: file.size };
    })
  );

  return uploads.filter(
    (upload): upload is UploadResult & { originalname: string; mimetype: string; size: number } =>
      upload !== null
  );
}

/**
 * Base64データをSupabase Storageにアップロード
 */
export async function uploadBase64ToSupabaseStorage(
  base64Data: string,
  category: string = 'records',
  options: {
    storeId?: number;
    visibility?: StorageVisibility;
  } = {},
): Promise<UploadResult | null> {
  const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    console.error('無効なBase64データ形式です');
    return null;
  }

  const mimeType = matches[1];
  const ext = MIME_TO_EXT[mimeType] || '.jpg';
  const buffer = Buffer.from(matches[2], 'base64');
  const visibility = options.visibility ?? 'public';
  const filePath = buildFilePath(category, ext, options.storeId);

  return uploadBuffer(buffer, filePath, mimeType, visibility);
}

/**
 * 複数のBase64画像をSupabase Storageにアップロード
 */
export async function uploadMultipleBase64ToSupabaseStorage(
  base64DataArray: string[],
  category: string = 'records',
  options: {
    storeId?: number;
    visibility?: StorageVisibility;
  } = {},
): Promise<string[]> {
  const uploads = await Promise.all(
    base64DataArray.map(async (base64Data) => {
      const result = await uploadBase64ToSupabaseStorage(base64Data, category, options);
      return result?.url ?? null;
    })
  );

  return uploads.filter((url): url is string => url !== null);
}

/**
 * Supabase Storageからファイルを削除
 */
export async function deleteFromSupabaseStorage(
  fileReference: string,
  storeId?: number,
): Promise<boolean> {
  const client = requireSupabase();
  if (!client) return false;

  try {
    const parsed = parseStoredFileReference(fileReference);
    if (!parsed) {
      console.error('無効なファイル参照:', fileReference);
      return false;
    }

    if (typeof storeId === 'number' && !isStoreScopedPath(parsed.path, storeId)) {
      console.error('他店舗のファイル削除が拒否されました:', parsed.path);
      return false;
    }

    const { error } = await client.storage.from(parsed.bucket).remove([parsed.path]);

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

async function ensureBucket(
  client: NonNullable<typeof supabase>,
  name: string,
  options: { public: boolean },
): Promise<boolean> {
  const { data: buckets, error: listError } = await client.storage.listBuckets();

  if (listError) {
    console.error('バケット一覧の取得に失敗:', listError);
    return false;
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === name);
  if (bucketExists) {
    return true;
  }

  const { error: createError } = await client.storage.createBucket(name, {
    public: options.public,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
  });

  if (createError && !createError.message?.includes('already exists')) {
    console.error(`バケット '${name}' の作成に失敗:`, createError);
    return false;
  }

  if (!createError) {
    console.log(`Supabase Storageバケット '${name}' を作成しました`);
  }

  return true;
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
    const publicReady = await ensureBucket(client, PUBLIC_STORAGE_BUCKET, { public: true });
    const privateReady = await ensureBucket(client, PRIVATE_STORAGE_BUCKET, { public: false });

    if (publicReady) {
      console.log(`Supabase Storage: 公開バケット '${PUBLIC_STORAGE_BUCKET}' を使用します`);
    }
    if (privateReady) {
      console.log(`Supabase Storage: 非公開バケット '${PRIVATE_STORAGE_BUCKET}' を使用します`);
    }

    return publicReady && privateReady;
  } catch (error) {
    console.error('Supabase Storage初期化エラー:', error);
    return false;
  }
}
