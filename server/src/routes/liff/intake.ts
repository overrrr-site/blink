import express from 'express';
import pool from '../../db/connection.js';
import { sendBadRequest, sendNotFound, sendServerError } from '../../utils/response.js';
import { requireOwnerToken } from './common.js';
import {
  INTAKE_QUESTIONS,
  getNextQuestion,
  formatQuestionMessage,
  summarizeIntake,
  saveIntakeResults,
  type IntakeSession,
  type IntakeQuestion,
} from '../../services/ai/intakeChat.js';

const router = express.Router();

/** IntakeQuestion からフロント向けレスポンスを組み立てる */
function buildQuestionResponse(
  question: IntakeQuestion | { isFollowUp: true; content: string; type: 'text'; parentKey: string },
  dogName: string
) {
  const content = formatQuestionMessage(question, dogName);

  if ('isFollowUp' in question) {
    return { role: 'assistant' as const, content, type: 'text' as const };
  }

  return {
    role: 'assistant' as const,
    content,
    type: question.type,
    choices: question.choices,
    allowOther: question.allowOther,
    allowSupplementText: question.allowSupplementText,
    skippable: question.skippable,
  };
}

// セッション開始（未完了セッションがあれば復元）
router.post('/intake/start', async function (req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dog_id } = req.body;
    if (!dog_id) {
      return sendBadRequest(res, 'dog_id は必須です');
    }

    // 犬がこの飼い主のものか確認し、名前も取得
    const dogResult = await pool.query(
      `SELECT d.id, d.name
       FROM dogs d
       JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND d.owner_id = $2 AND o.store_id = $3`,
      [dog_id, decoded.ownerId, decoded.storeId]
    );

    if (dogResult.rows.length === 0) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const dog = dogResult.rows[0] as { id: number; name: string };

    // 既存の in_progress セッションを検索
    const existingSession = await pool.query(
      `SELECT id, current_phase, current_question, status, structured_data
       FROM ai_intake_sessions
       WHERE dog_id = $1 AND status = 'in_progress'
       ORDER BY created_at DESC
       LIMIT 1`,
      [dog_id]
    );

    if (existingSession.rows.length > 0) {
      // 既存セッションを復元
      const session = existingSession.rows[0] as {
        id: number; current_phase: number; current_question: number; structured_data: Record<string, unknown>;
      };

      // 過去のメッセージを取得
      const messagesResult = await pool.query(
        `SELECT role, content, question_key, choice_values
         FROM ai_intake_messages
         WHERE session_id = $1
         ORDER BY created_at ASC`,
        [session.id]
      );

      // 過去のメッセージに加え、現在の質問の選択肢情報も返す
      const messages = messagesResult.rows.map((m: Record<string, unknown>) => ({
        role: m.role as string,
        content: m.content as string,
      }));

      // 現在の質問を特定して選択肢情報を追加
      const currentQ = INTAKE_QUESTIONS[session.current_question];
      const currentQuestionInfo = currentQ ? {
        type: currentQ.type,
        choices: currentQ.choices,
        allowOther: currentQ.allowOther,
        allowSupplementText: currentQ.allowSupplementText,
        skippable: currentQ.skippable,
      } : undefined;

      const percentage = Math.round((session.current_question / INTAKE_QUESTIONS.length) * 100);

      return res.json({
        success: true,
        data: {
          session_id: session.id,
          dog_name: dog.name,
          messages,
          currentQuestion: currentQuestionInfo,
          progress: {
            phase: session.current_phase,
            totalPhases: 4,
            percentage,
          },
        },
      });
    }

    // 新規セッション作成
    const newSession = await pool.query(
      `INSERT INTO ai_intake_sessions (dog_id, owner_id, store_id, status, current_phase, current_question)
       VALUES ($1, $2, $3, 'in_progress', 1, 0)
       RETURNING id`,
      [dog_id, decoded.ownerId, decoded.storeId]
    );

    const sessionId = newSession.rows[0].id;

    // 最初の質問
    const firstQuestion = INTAKE_QUESTIONS[0];
    const questionResponse = buildQuestionResponse(firstQuestion, dog.name);

    // メッセージを保存
    await pool.query(
      `INSERT INTO ai_intake_messages (session_id, role, content, phase, question_key)
       VALUES ($1, 'assistant', $2, $3, $4)`,
      [sessionId, questionResponse.content, firstQuestion.phase, firstQuestion.key]
    );

    res.json({
      success: true,
      data: {
        session_id: sessionId,
        dog_name: dog.name,
        messages: [questionResponse],
        progress: {
          phase: 1,
          totalPhases: 4,
          percentage: 0,
        },
      },
    });
  } catch (error: unknown) {
    sendServerError(res, 'インテークセッションの開始に失敗しました', error);
  }
});

// 回答送信 → 次の質問 or 完了
router.post('/intake/respond', async function (req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { session_id, content, choice_values } = req.body as {
      session_id: number;
      content?: string;
      choice_values?: string[];
    };

    if (!session_id) {
      return sendBadRequest(res, 'session_id は必須です');
    }
    if (!content && (!choice_values || choice_values.length === 0)) {
      return sendBadRequest(res, '回答内容は必須です');
    }

    // セッション確認
    const sessionResult = await pool.query(
      `SELECT s.id, s.dog_id, s.current_phase, s.current_question, s.status, s.structured_data,
              d.name as dog_name
       FROM ai_intake_sessions s
       JOIN dogs d ON s.dog_id = d.id
       JOIN owners o ON d.owner_id = o.id
       WHERE s.id = $1 AND d.owner_id = $2 AND o.store_id = $3`,
      [session_id, decoded.ownerId, decoded.storeId]
    );

    if (sessionResult.rows.length === 0) {
      return sendNotFound(res, 'セッションが見つかりません');
    }

    const session = sessionResult.rows[0] as {
      id: number; dog_id: number; current_phase: number; current_question: number;
      status: string; structured_data: Record<string, unknown>; dog_name: string;
    };

    if (session.status !== 'in_progress') {
      return sendBadRequest(res, 'このセッションは既に完了しています');
    }

    // 現在の質問キーを特定
    const currentQuestion = INTAKE_QUESTIONS[session.current_question];
    const questionKey = currentQuestion?.key || 'follow_up';
    const userContent = content || (choice_values ? choice_values.join(', ') : '');

    // ユーザーの回答を保存
    await pool.query(
      `INSERT INTO ai_intake_messages (session_id, role, content, phase, question_key, choice_values)
       VALUES ($1, 'user', $2, $3, $4, $5)`,
      [
        session_id,
        userContent,
        session.current_phase,
        questionKey,
        choice_values ? JSON.stringify(choice_values) : null,
      ]
    );

    // 次の質問を決定
    const intakeSession: IntakeSession = {
      id: session.id,
      dog_id: session.dog_id,
      current_phase: session.current_phase,
      current_question: session.current_question,
      status: session.status,
      structured_data: session.structured_data || {},
    };

    const nextResult = getNextQuestion(intakeSession, {
      question_key: questionKey,
      values: choice_values,
      text: content,
    });

    if (nextResult) {
      // 次の質問がある
      const questionResponse = buildQuestionResponse(nextResult, session.dog_name);

      const isFollowUp = 'isFollowUp' in nextResult;
      let nextIndex = session.current_question;
      let nextPhase = session.current_phase;

      if (!isFollowUp) {
        nextIndex = session.current_question + 1;
        nextPhase = (nextResult as IntakeQuestion).phase;
      }

      // 次の質問メッセージを保存
      const nextKey = isFollowUp
        ? (nextResult as { parentKey: string }).parentKey + '_followup'
        : (nextResult as IntakeQuestion).key;

      await pool.query(
        `INSERT INTO ai_intake_messages (session_id, role, content, phase, question_key)
         VALUES ($1, 'assistant', $2, $3, $4)`,
        [session_id, questionResponse.content, nextPhase, nextKey]
      );

      // セッション更新
      await pool.query(
        `UPDATE ai_intake_sessions SET current_phase = $1, current_question = $2, updated_at = NOW() WHERE id = $3`,
        [nextPhase, nextIndex, session_id]
      );

      const percentage = Math.round((nextIndex / INTAKE_QUESTIONS.length) * 100);

      res.json({
        success: true,
        data: {
          messages: [questionResponse],
          progress: { phase: nextPhase, totalPhases: 4, percentage },
          isComplete: false,
        },
      });
    } else {
      // 全質問完了 → AI要約＋保存
      const allMessages = await pool.query(
        `SELECT role, content, question_key FROM ai_intake_messages WHERE session_id = $1 ORDER BY created_at ASC`,
        [session_id]
      );

      const chatMessages = allMessages.rows.map((m: Record<string, unknown>) => ({
        role: m.role as 'assistant' | 'user',
        content: m.content as string,
        question_key: m.question_key as string | undefined,
      }));

      const summaryResult = await summarizeIntake(chatMessages, session.dog_name);

      if (summaryResult) {
        await saveIntakeResults(pool, session_id, summaryResult, session.dog_id);
      } else {
        // AI要約に失敗した場合もセッションは完了にする
        await pool.query(
          `UPDATE ai_intake_sessions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
          [session_id]
        );
      }

      res.json({
        success: true,
        data: {
          messages: [],
          progress: { phase: 4, totalPhases: 4, percentage: 100 },
          isComplete: true,
          summary: summaryResult ? {
            structured_data: summaryResult.personality,
            ai_summary: summaryResult.trainer_summary,
            education_plan: summaryResult.education_plan,
          } : null,
        },
      });
    }
  } catch (error: unknown) {
    sendServerError(res, 'インテーク回答の処理に失敗しました', error);
  }
});

// セッション状態確認
router.get('/intake/session/:dogId', async function (req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dogId } = req.params;

    const dogCheck = await pool.query(
      `SELECT d.id FROM dogs d JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND d.owner_id = $2 AND o.store_id = $3`,
      [dogId, decoded.ownerId, decoded.storeId]
    );

    if (dogCheck.rows.length === 0) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const sessionResult = await pool.query(
      `SELECT id, status, current_phase, current_question, completed_at
       FROM ai_intake_sessions WHERE dog_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [dogId]
    );

    const session = sessionResult.rows.length > 0 ? sessionResult.rows[0] : null;

    res.json({
      success: true,
      data: {
        session,
        hasCompletedIntake: session?.status === 'completed',
      },
    });
  } catch (error: unknown) {
    sendServerError(res, 'セッション状態の取得に失敗しました', error);
  }
});

// 飼い主の犬一覧＋intake状態
router.get('/intake/dogs', async function (req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const dogsResult = await pool.query(
      `SELECT d.id, d.name, d.photo_url,
              (SELECT s.status FROM ai_intake_sessions s WHERE s.dog_id = d.id ORDER BY s.created_at DESC LIMIT 1) as latest_intake_status
       FROM dogs d JOIN owners o ON d.owner_id = o.id
       WHERE d.owner_id = $1 AND o.store_id = $2 ORDER BY d.name ASC`,
      [decoded.ownerId, decoded.storeId]
    );

    const dogs = dogsResult.rows.map((d: Record<string, unknown>) => ({
      id: d.id,
      name: d.name,
      photo_url: d.photo_url,
      intakeStatus: d.latest_intake_status === 'completed' ? 'completed'
        : d.latest_intake_status === 'in_progress' ? 'in_progress'
        : 'not_started',
    }));

    res.json({ success: true, data: dogs });
  } catch (error: unknown) {
    sendServerError(res, '犬一覧の取得に失敗しました', error);
  }
});

// 完了済みインテーク結果取得
router.get('/intake/result/:dogId', async function (req, res) {
  try {
    const decoded = requireOwnerToken(req, res);
    if (!decoded) return;

    const { dogId } = req.params;

    const dogCheck = await pool.query(
      `SELECT d.id FROM dogs d JOIN owners o ON d.owner_id = o.id
       WHERE d.id = $1 AND d.owner_id = $2 AND o.store_id = $3`,
      [dogId, decoded.ownerId, decoded.storeId]
    );

    if (dogCheck.rows.length === 0) {
      return sendNotFound(res, '犬が見つかりません');
    }

    const resultQuery = await pool.query(
      `SELECT structured_data, ai_summary, education_plan, completed_at
       FROM ai_intake_sessions WHERE dog_id = $1 AND status = 'completed'
       ORDER BY completed_at DESC LIMIT 1`,
      [dogId]
    );

    if (resultQuery.rows.length === 0) {
      return sendNotFound(res, '完了済みのインテークが見つかりません');
    }

    const result = resultQuery.rows[0];
    res.json({
      success: true,
      data: {
        structured_data: result.structured_data,
        ai_summary: result.ai_summary,
        education_plan: result.education_plan,
        completed_at: result.completed_at,
      },
    });
  } catch (error: unknown) {
    sendServerError(res, 'インテーク結果の取得に失敗しました', error);
  }
});

export default router;
