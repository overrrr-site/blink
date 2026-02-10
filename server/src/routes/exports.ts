import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';
import { logExportAction, type ExportOutputFormat, type ExportType } from '../services/exportLogService.js';

const router = express.Router();
router.use(authenticate);

const VALID_EXPORT_TYPES: ExportType[] = ['records', 'reservations'];
const VALID_OUTPUT_FORMATS: ExportOutputFormat[] = ['csv', 'print'];

router.post('/log', async (req: AuthRequest, res) => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const { export_type, output_format, filters } = req.body as {
      export_type?: string;
      output_format?: string;
      filters?: unknown;
    };

    if (!export_type || !VALID_EXPORT_TYPES.includes(export_type as ExportType)) {
      sendBadRequest(res, 'export_typeが不正です');
      return;
    }
    if (!output_format || !VALID_OUTPUT_FORMATS.includes(output_format as ExportOutputFormat)) {
      sendBadRequest(res, 'output_formatが不正です');
      return;
    }

    await logExportAction({
      storeId: req.storeId!,
      staffId: req.userId,
      exportType: export_type as ExportType,
      outputFormat: output_format as ExportOutputFormat,
      filters,
    });

    res.json({ success: true });
  } catch (error) {
    sendServerError(res, '出力ログの保存に失敗しました', error);
  }
});

export default router;
