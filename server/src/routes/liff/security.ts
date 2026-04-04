import jwt from 'jsonwebtoken';

const LINE_ID_TOKEN_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';
const OWNER_TOKEN_EXPIRATION = '30d';

type LineIdTokenPayload = {
  sub?: unknown;
  name?: unknown;
  picture?: unknown;
  email?: unknown;
};

export class SecurityConfigurationError extends Error {}

export class LineIdentityVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LineIdentityVerificationError';
  }
}

export interface VerifiedLineIdentity {
  userId: string;
  displayName?: string;
  pictureUrl?: string;
  email?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new SecurityConfigurationError('JWT_SECRET is not configured securely');
  }

  return secret;
}

export function signOwnerToken(payload: {
  ownerId: number;
  storeId: number;
  lineUserId: string;
}): string {
  return jwt.sign(
    {
      ownerId: payload.ownerId,
      storeId: payload.storeId,
      lineUserId: payload.lineUserId,
      type: 'owner',
    },
    getJwtSecret(),
    { expiresIn: OWNER_TOKEN_EXPIRATION },
  );
}

function getLineLoginChannelId(): string {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim();

  if (!channelId) {
    throw new SecurityConfigurationError('LINE_LOGIN_CHANNEL_ID is not configured');
  }

  return channelId;
}

function asVerifiedLineIdentity(payload: LineIdTokenPayload): VerifiedLineIdentity {
  if (typeof payload.sub !== 'string' || payload.sub.trim().length === 0) {
    throw new LineIdentityVerificationError('LINE ID token payload is invalid');
  }

  return {
    userId: payload.sub,
    displayName: typeof payload.name === 'string' ? payload.name : undefined,
    pictureUrl: typeof payload.picture === 'string' ? payload.picture : undefined,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

export async function verifyLineIdentity(
  idToken: string,
  expectedLineUserId?: string,
): Promise<VerifiedLineIdentity> {
  const trimmedIdToken = idToken.trim();
  if (!trimmedIdToken) {
    throw new LineIdentityVerificationError('LINE ID token is required');
  }

  const response = await fetch(LINE_ID_TOKEN_VERIFY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      id_token: trimmedIdToken,
      client_id: getLineLoginChannelId(),
    }),
  });

  let payload: LineIdTokenPayload | null = null;
  try {
    payload = await response.json() as LineIdTokenPayload;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload) {
    throw new LineIdentityVerificationError('LINE ID token verification failed');
  }

  const identity = asVerifiedLineIdentity(payload);
  if (expectedLineUserId && identity.userId !== expectedLineUserId) {
    throw new LineIdentityVerificationError('LINE user identity does not match');
  }

  return identity;
}
