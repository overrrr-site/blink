// LIFF SDKはグローバルに読み込まれるため、型定義のみ使用
declare const liff: {
  init(config: { liffId: string }): Promise<void>;
  isLoggedIn(): boolean;
  login(): void;
  logout(): void;
  getProfile(): Promise<{
    userId: string;
    displayName: string;
    pictureUrl?: string;
    statusMessage?: string;
  }>;
  isInClient(): boolean;
  ready: Promise<void>;
  scanCodeV2(): Promise<{ value: string }>;
  getContext(): {
    type: string;
    viewType?: string;
    userId?: string;
    utouId?: string;
    roomId?: string;
    groupId?: string;
  } | null;
  getOS(): 'ios' | 'android' | 'web';
  getLineVersion(): string | null;
};

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

function isLiffAvailable(): boolean {
  return typeof liff !== 'undefined';
}

let liffInitialized = false;

export async function initLiff(): Promise<void> {
  if (!LIFF_ID) return;
  if (!isLiffAvailable()) return;
  if (liffInitialized) return;

  await liff.init({ liffId: LIFF_ID });
  liffInitialized = true;
}

export async function getLiffProfile(): Promise<{
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}> {
  if (!isLiffAvailable()) {
    throw new Error('LIFF SDK is not loaded');
  }

  if (!liff.isLoggedIn()) {
    // login()はリダイレクトを発生させるため、この後のコードは実行されない
    liff.login();
    throw new Error('Redirecting to LINE login...');
  }

  return liff.getProfile();
}

export function isLiffLoggedIn(): boolean {
  if (!isLiffAvailable()) return false;
  return liff.isLoggedIn();
}

export function logout(): void {
  if (isLiffAvailable() && liff.isLoggedIn()) {
    liff.logout();
  }
}

export function isInLine(): boolean {
  return isLiffAvailable() && liff.isInClient();
}

function classifyQrScanError(error: { code?: string; message?: string }): string {
  const errorCode = (error.code ?? '').toUpperCase();
  const errorMessage = (error.message ?? '').toLowerCase();

  if (errorCode === 'FORBIDDEN' || errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return 'カメラへのアクセスが許可されていません。\n\nLINE Developers Consoleで「Scan QR」スコープが有効になっているか確認してください。';
  }
  if (errorCode === 'INVALID_OPERATION' || errorMessage.includes('not supported') || errorMessage.includes('unavailable')) {
    return 'QRコードスキャンが利用できません。\n\nLIFFアプリのサイズを「Full」に設定してください。';
  }
  if (errorCode === 'INIT_FAILED' || errorMessage.includes('init')) {
    return 'LIFFの初期化に失敗しました。ページを再読み込みしてください。';
  }
  return `QRコードスキャンに失敗しました\n\nエラー: ${errorCode || error.message || '不明なエラー'}\n\nLINE Developers Consoleで「Scan QR」スコープとLIFFサイズ「Full」を確認してください。`;
}

export async function scanQRCode(): Promise<string> {
  if (!isLiffAvailable()) {
    throw new Error('LIFF SDK is not loaded');
  }

  if (!liff.isInClient()) {
    throw new Error('QRコードスキャンはLINEアプリ内でのみ利用可能です。LINEアプリからこのページを開いてください。');
  }

  try {
    const result = await liff.scanCodeV2();
    return result.value;
  } catch (error) {
    const scanError = error as { code?: string; message?: string };
    throw new Error(classifyQrScanError(scanError));
  }
}
