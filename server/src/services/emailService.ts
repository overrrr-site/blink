import nodemailer from 'nodemailer';
import pool from '../db/connection.js';

// メール送信クライアント
let transporter: nodemailer.Transporter | null = null;

export function initializeEmailClient() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.warn('⚠️  メール送信の設定が不完全です');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
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
    if (!transporter) {
      const client = initializeEmailClient();
      if (!client) {
        console.warn('メール送信クライアントが初期化されていません');
        return false;
      }
      transporter = client;
    }

    const smtpFrom = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@blink.example.com';

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text,
      html: html || text,
    });

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
