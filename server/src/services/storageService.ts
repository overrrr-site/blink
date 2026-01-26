import { supabase } from '../db/supabase.js';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Supabase Storageのバケット名
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

/**
 * Supabase Storageが利用可能かどうかを確認
 */
export function isSupabaseStorageAvailable(): boolean {
  return supabase !== null && 
    !!process.env.SUPABASE_URL && 
    !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * ファイルをSupabase Storageにアップロード
 */
export async function uploadToSupabaseStorage(
  file: Express.Multer.File,
  category: string = 'general'
): Promise<{ url: string; path: string } | null> {
  if (!supabase) {
    console.error('Supabaseクライアントが初期化されていません');
    return null;
  }

  try {
    // ユニークなファイル名を生成
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${ext}`;
    const filePath = `${category}/${uniqueFilename}`;

    // Supabase Storageにアップロード
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      return null;
    }

    // 公開URLを取得
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    return {
      url: urlData.publicUrl,
      path: filePath,
    };
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    return null;
  }
}

/**
 * 複数ファイルをSupabase Storageにアップロード
 */
export async function uploadMultipleToSupabaseStorage(
  files: Express.Multer.File[],
  category: string = 'general'
): Promise<Array<{ url: string; path: string; originalname: string; mimetype: string; size: number }>> {
  const results: Array<{ url: string; path: string; originalname: string; mimetype: string; size: number }> = [];

  for (const file of files) {
    const result = await uploadToSupabaseStorage(file, category);
    if (result) {
      results.push({
        ...result,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
    }
  }

  return results;
}

/**
 * Supabase Storageからファイルを削除
 */
export async function deleteFromSupabaseStorage(fileUrl: string): Promise<boolean> {
  if (!supabase) {
    console.error('Supabaseクライアントが初期化されていません');
    return false;
  }

  try {
    // URLからファイルパスを抽出
    // 形式: https://xxx.supabase.co/storage/v1/object/public/uploads/category/filename.ext
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/');
    const bucketIndex = pathParts.indexOf(STORAGE_BUCKET);
    
    if (bucketIndex === -1) {
      console.error('無効なファイルURL:', fileUrl);
      return false;
    }

    const filePath = pathParts.slice(bucketIndex + 1).join('/');

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

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
  if (!supabase) {
    console.log('ℹ️  Supabase Storage: ローカルファイルシステムを使用します');
    return false;
  }

  try {
    // バケットが存在するか確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('バケット一覧の取得に失敗:', listError);
      return false;
    }

    const bucketExists = buckets?.some(b => b.name === STORAGE_BUCKET);

    if (!bucketExists) {
      // バケットを作成
      const { error: createError } = await supabase.storage.createBucket(STORAGE_BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
        ],
      });

      if (createError) {
        // バケットが既に存在する場合は無視
        if (!createError.message?.includes('already exists')) {
          console.error('バケット作成に失敗:', createError);
          return false;
        }
      } else {
        console.log(`✅ Supabase Storageバケット '${STORAGE_BUCKET}' を作成しました`);
      }
    }

    console.log(`✅ Supabase Storage: バケット '${STORAGE_BUCKET}' を使用します`);
    return true;
  } catch (error) {
    console.error('Supabase Storage初期化エラー:', error);
    return false;
  }
}
