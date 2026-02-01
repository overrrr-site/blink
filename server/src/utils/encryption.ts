import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm' as const;
const KEY_LENGTH_BYTES = 32;
const IV_LENGTH_BYTES = 16;
const EXPECTED_PARTS = 3;
const SEPARATOR = ':';

let cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (key.length < KEY_LENGTH_BYTES) {
    throw new Error(`ENCRYPTION_KEY must be at least ${KEY_LENGTH_BYTES} characters long`);
  }
  cachedKey = Buffer.from(key.substring(0, KEY_LENGTH_BYTES), 'utf8');
  return cachedKey;
}

export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted].join(SEPARATOR);
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(SEPARATOR);

  if (parts.length !== EXPECTED_PARTS) {
    throw new Error('Invalid encrypted data format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
}
