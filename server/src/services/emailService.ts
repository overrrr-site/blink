import { Resend } from 'resend';

let resend: Resend | null = null;

export function initializeEmailClient(): Resend | null {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY が設定されていません');
    return null;
  }

  resend = new Resend(resendApiKey);
  console.log('Resendメールクライアントが初期化されました');
  return resend;
}

/**
 * Resendクライアントを取得（未初期化なら遅延初期化を試みる）
 */
function getClient(): Resend | null {
  return resend ?? initializeEmailClient();
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
  const client = getClient();
  if (!client) {
    console.warn('メール送信クライアントが初期化されていません');
    return false;
  }

  try {
    const fromAddress = process.env.RESEND_FROM || 'Blink <onboarding@resend.dev>';

    const { error } = await client.emails.send({
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

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
