import { Resend } from 'resend';
import pool from '../db/connection.js';

// Resendクライアント
let resend: Resend | null = null;

export function initializeEmailClient() {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.warn('⚠️  RESEND_API_KEY が設定されていません');
    return null;
  }

  resend = new Resend(resendApiKey);
  console.log('✅ Resendメールクライアントが初期化されました');
  return resend;
}

/**
 * メールを送信
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  html?: string
): Promise<boolean> {
  try {
    if (!resend) {
      const client = initializeEmailClient();
      if (!client) {
        console.warn('メール送信クライアントが初期化されていません');
        return false;
      }
      resend = client;
    }

    // Resendの無料プランではonboarding@resend.devからのみ送信可能
    // カスタムドメインを設定すれば任意のFromアドレスを使用可能
    const fromAddress = process.env.RESEND_FROM || 'Blink <onboarding@resend.dev>';

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [to],
      subject,
      text,
      html: html || text,
    });

    if (error) {
      console.error('Resend error:', error);
      return false;
    }

    console.log(`✅ メール送信成功: ${to}`);
    return true;
  } catch (error: any) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * 飼い主のメールアドレスを取得
 */
export async function getOwnerEmail(ownerId: number): Promise<string | null> {
  try {
    const result = await pool.query(
      `SELECT email FROM owners WHERE id = $1 AND email IS NOT NULL AND email != ''`,
      [ownerId]
    );

    return result.rows[0]?.email || null;
  } catch (error) {
    console.error('Error fetching owner email:', error);
    return null;
  }
}
