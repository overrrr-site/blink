import crypto from 'crypto';

/**
 * 暗号化キーを取得（環境変数から）
 * 本番環境では必ず設定すること
 */
function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  // 32バイト（256ビット）のキーが必要
  if (key.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }
  return key.substring(0, 32);
}

/**
 * データを暗号化（AES-256-GCM）
 */
export function encrypt(text: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'utf8');
    const iv = crypto.randomBytes(16); // 初期化ベクトル
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // IV + AuthTag + EncryptedData の形式で返す
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * データを復号化（AES-256-GCM）
 */
export function decrypt(encryptedText: string): string {
  try {
    const key = Buffer.from(getEncryptionKey(), 'utf8');
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}
