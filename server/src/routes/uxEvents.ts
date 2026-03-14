import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { recordUxEvent, UxEventInput, UxValidationError } from '../services/uxAnalyticsService.js';
import { requireStoreId, sendBadRequest, sendServerError } from '../utils/response.js';

const router = express.Router();
router.use(authenticate);

function normalizePayload(body: unknown): UxEventInput {
  const source = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;

  return {
    event_name: String(source.event_name ?? source.eventName ?? ''),
    flow: String(source.flow ?? ''),
    step: String(source.step ?? ''),
    session_id: String(source.session_id ?? source.sessionId ?? ''),
    path: String(source.path ?? ''),
    staff_id_hash: String(source.staff_id_hash ?? source.staffIdHash ?? ''),
    timestamp: String(source.timestamp ?? new Date().toISOString()),
    meta: (source.meta && typeof source.meta === 'object' && !Array.isArray(source.meta))
      ? (source.meta as Record<string, unknown>)
      : {},
  };
}

router.post('/', async (req: AuthRequest, res): Promise<void> => {
  try {
    if (!requireStoreId(req, res)) {
      return;
    }

    const payload = normalizePayload(req.body);
    const result = await recordUxEvent({
      storeId: req.storeId!,
      staffId: req.userId ?? null,
      payload,
    });

    res.status(201).json({
      ok: true,
      queued_report_job_id: result.queuedJobId,
    });
  } catch (error) {
    if (error instanceof UxValidationError) {
      sendBadRequest(res, error.message);
      return;
    }
    sendServerError(res, 'UXイベントの保存に失敗しました', error);
  }
});

export default router;

