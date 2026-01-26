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
  scanCodeV2(): Promise<{
    value: string;
  }>;
};

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

// 初期化済みフラグ
let liffInitialized = false;

export const initLiff = async (): Promise<void> => {
  console.log('[LIFF Debug] initLiff called, LIFF_ID:', LIFF_ID ? 'SET' : 'NOT SET');
  
  if (!LIFF_ID) {
    console.warn('[LIFF Debug] LIFF_ID is not set. LIFF features will be disabled.');
    return;
  }

  if (typeof liff === 'undefined') {
    console.warn('[LIFF Debug] LIFF SDK is not loaded. Make sure liff.html is used.');
    return;
  }

  // 既に初期化済みの場合はスキップ
  if (liffInitialized) {
    console.log('[LIFF Debug] LIFF already initialized, skipping');
    return;
  }

  try {
    console.log('[LIFF Debug] Calling liff.init()...');
    await liff.init({ liffId: LIFF_ID });
    liffInitialized = true;
    console.log('[LIFF Debug] LIFF initialized successfully');
    console.log('[LIFF Debug] isLoggedIn:', liff.isLoggedIn());
    console.log('[LIFF Debug] isInClient:', liff.isInClient());
  } catch (error) {
    console.error('[LIFF Debug] LIFF initialization failed:', error);
    throw error;
  }
};

export const getLiffProfile = async () => {
  console.log('[LIFF Debug] getLiffProfile called');
  
  if (typeof liff === 'undefined') {
    console.error('[LIFF Debug] LIFF SDK is not loaded');
    throw new Error('LIFF SDK is not loaded');
  }

  const loggedIn = liff.isLoggedIn();
  console.log('[LIFF Debug] isLoggedIn check in getLiffProfile:', loggedIn);

  if (!loggedIn) {
    console.log('[LIFF Debug] Not logged in, calling liff.login()...');
    // login()はリダイレクトを発生させるため、この後のコードは実行されない
    // リダイレクト後、再度このページがロードされ、isLoggedIn()がtrueになる
    liff.login();
    // リダイレクトが発生するため、ここには到達しない
    throw new Error('Redirecting to LINE login...');
  }
  
  console.log('[LIFF Debug] Logged in, getting profile...');
  const profile = await liff.getProfile();
  console.log('[LIFF Debug] Profile obtained:', profile.userId);
  return profile;
};

export const isLiffLoggedIn = (): boolean => {
  if (typeof liff === 'undefined') {
    console.log('[LIFF Debug] isLiffLoggedIn: LIFF undefined, returning false');
    return false;
  }
  const result = liff.isLoggedIn();
  console.log('[LIFF Debug] isLiffLoggedIn:', result);
  return result;
};

export const logout = () => {
  if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
    liff.logout();
  }
};

export const isInLine = (): boolean => {
  return typeof liff !== 'undefined' && liff.isInClient();
};

export const scanQRCode = async (): Promise<string> => {
  if (typeof liff === 'undefined') {
    throw new Error('LIFF SDK is not loaded');
  }

  console.log('[LIFF Debug] scanQRCode called, isInClient:', liff.isInClient());

  try {
    // scanCodeV2はLINEアプリ内と一部の外部ブラウザで動作
    const result = await liff.scanCodeV2();
    console.log('[LIFF Debug] QR scan result:', result.value ? 'success' : 'empty');
    return result.value;
  } catch (error: any) {
    console.error('[LIFF Debug] QR scan error:', error);
    // エラーの種類を判別して適切なメッセージを返す
    if (error.code === 'FORBIDDEN' || error.message?.includes('permission')) {
      throw new Error('カメラへのアクセスが許可されていません');
    }
    if (error.code === 'INVALID_OPERATION' || error.message?.includes('not supported')) {
      throw new Error('このブラウザではQRコードスキャンがサポートされていません');
    }
    throw error;
  }
};
