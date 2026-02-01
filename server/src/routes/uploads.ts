import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendBadRequest, sendForbidden, sendNotFound, sendServerError } from '../utils/response.js';
import {
  isSupabaseStorageAvailable,
  uploadToSupabaseStorage,
  uploadMultipleToSupabaseStorage,
  deleteFromSupabaseStorage,
} from '../services/storageService.js';

const router = express.Router();
router.use(authenticate);

// Vercel環境かどうかを判定
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// Supabase Storageが利用可能かどうか
const useSupabaseStorage = isSupabaseStorageAvailable();

// アップロードディレクトリの設定（ローカル用）
// Vercel環境では /tmp を使用（書き込み可能な唯一のディレクトリ）
// ローカル環境では public/uploads を使用
const uploadDir = isVercel 
  ? '/tmp/uploads' 
  : path.join(process.cwd(), 'public', 'uploads');

// ディレクトリの作成（エラーをキャッチして続行）- Supabase使用時は不要
if (!useSupabaseStorage) {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch (error) {
    console.warn('アップロードディレクトリの作成に失敗しました:', error);
  }
}

// Multer設定
// Supabase Storage使用時はメモリストレージ、それ以外はディスクストレージ
const storage = useSupabaseStorage
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        // カテゴリ別にディレクトリを作成
        const category = (req.query.category as string) || 'general';
        const categoryDir = path.join(uploadDir, category);
        try {
          if (!fs.existsSync(categoryDir)) {
            fs.mkdirSync(categoryDir, { recursive: true });
          }
        } catch (error) {
          console.warn('カテゴリディレクトリの作成に失敗:', error);
        }
        cb(null, categoryDir);
      },
      filename: (req, file, cb) => {
        // ユニークなファイル名を生成
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
      }
    });

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 許可するファイルタイプ
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('許可されていないファイル形式です。JPEG, PNG, GIF, WebP, PDFのみアップロード可能です。'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB上限
  }
});

// 単一ファイルアップロード
router.post('/', upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      sendBadRequest(res, 'ファイルが見つかりません');
      return;
    }

    const category = (req.query.category as string) || 'general';

    // Supabase Storage使用時
    if (useSupabaseStorage) {
      const result = await uploadToSupabaseStorage(req.file, category);
      if (!result) {
        sendServerError(res, 'ファイルのアップロードに失敗しました', new Error('Supabase Storage upload failed'));
        return;
      }

      res.json({
        success: true,
        url: result.url,
        path: result.path,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        storage: 'supabase',
      });
      return;
    }

    // ローカルファイルシステム使用時
    const fileUrl = `/uploads/${category}/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      storage: 'local',
    });
  } catch (error: any) {
    sendServerError(res, error.message || 'ファイルのアップロードに失敗しました', error);
  }
});

// 複数ファイルアップロード（最大10ファイル）
router.post('/multiple', upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      sendBadRequest(res, 'ファイルが見つかりません');
      return;
    }

    const category = (req.query.category as string) || 'general';

    // Supabase Storage使用時
    if (useSupabaseStorage) {
      const results = await uploadMultipleToSupabaseStorage(
        req.files as Express.Multer.File[],
        category
      );

      res.json({
        success: true,
        files: results,
        storage: 'supabase',
      });
      return;
    }

    // ローカルファイルシステム使用時
    const files = (req.files as Express.Multer.File[]).map(file => ({
      url: `/uploads/${category}/${file.filename}`,
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));

    res.json({
      success: true,
      files,
      storage: 'local',
    });
  } catch (error: any) {
    sendServerError(res, error.message || 'ファイルのアップロードに失敗しました', error);
  }
});

// ファイル削除
router.delete('/', async (req: AuthRequest, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      sendBadRequest(res, 'URLが指定されていません');
      return;
    }

    // Supabase Storage URL かどうかを判定
    const isSupabaseUrl = url.includes('supabase.co/storage');

    if (isSupabaseUrl) {
      const success = await deleteFromSupabaseStorage(url);
      if (success) {
        res.json({ success: true, message: 'ファイルを削除しました' });
      } else {
        sendServerError(res, 'ファイルの削除に失敗しました', new Error('Supabase Storage delete failed'));
      }
      return;
    }

    // ローカルファイルシステムからの削除
    // URLからファイルパスを取得（/uploads/以降）
    const relativePath = url.replace(/^\/uploads\//, '');
    const filePath = path.join(uploadDir, relativePath);
    
    // セキュリティチェック：uploadDir内のファイルのみ削除可能
    if (!filePath.startsWith(uploadDir)) {
      sendForbidden(res, '不正なパスです');
      return;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: 'ファイルを削除しました' });
    } else {
      sendNotFound(res, 'ファイルが見つかりません');
    }
  } catch (error: any) {
    sendServerError(res, error.message || 'ファイルの削除に失敗しました', error);
  }
});

export default router;
