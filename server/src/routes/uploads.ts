import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { sendBadRequest, sendForbidden, sendNotFound, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

// Vercel環境かどうかを判定
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// アップロードディレクトリの設定
// Vercel環境では /tmp を使用（書き込み可能な唯一のディレクトリ）
// ローカル環境では public/uploads を使用
const uploadDir = isVercel 
  ? '/tmp/uploads' 
  : path.join(process.cwd(), 'public', 'uploads');

// ディレクトリの作成（エラーをキャッチして続行）
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (error) {
  console.warn('アップロードディレクトリの作成に失敗しました（Vercel環境では正常）:', error);
}

// Multer設定
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // カテゴリ別にディレクトリを作成
    const category = (req as any).query.category || 'general';
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
router.post('/', upload.single('file'), (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      sendBadRequest(res, 'ファイルが見つかりません');
      return;
    }

    const category = req.query.category || 'general';
    const fileUrl = `/uploads/${category}/${req.file.filename}`;

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    sendServerError(res, error.message || 'ファイルのアップロードに失敗しました', error);
  }
});

// 複数ファイルアップロード（最大10ファイル）
router.post('/multiple', upload.array('files', 10), (req: AuthRequest, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      sendBadRequest(res, 'ファイルが見つかりません');
      return;
    }

    const category = req.query.category || 'general';
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
    });
  } catch (error: any) {
    console.error('Error uploading files:', error);
    sendServerError(res, error.message || 'ファイルのアップロードに失敗しました', error);
  }
});

// ファイル削除
router.delete('/', (req: AuthRequest, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      sendBadRequest(res, 'URLが指定されていません');
      return;
    }

    // URLからファイルパスを取得（/uploads/以降）
    // Vercel環境では /tmp/uploads を使用
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
    console.error('Error deleting file:', error);
    sendServerError(res, error.message || 'ファイルの削除に失敗しました', error);
  }
});

export default router;
