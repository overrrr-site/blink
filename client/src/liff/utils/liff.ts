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
};

const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';

export const initLiff = async (): Promise<void> => {
  if (!LIFF_ID) {
    console.warn('LIFF_ID is not set. LIFF features will be disabled.');
    return;
  }

  if (typeof liff === 'undefined') {
    console.warn('LIFF SDK is not loaded. Make sure liff.html is used.');
    return;
  }

  try {
    await liff.init({ liffId: LIFF_ID });
    console.log('LIFF initialized');
  } catch (error) {
    console.error('LIFF initialization failed:', error);
    throw error;
  }
};

export const getLiffProfile = async () => {
  if (typeof liff === 'undefined') {
    throw new Error('LIFF SDK is not loaded');
  }

  if (!liff.isLoggedIn()) {
    // login()はリダイレクトを発生させるため、この後のコードは実行されない
    // リダイレクト後、再度このページがロードされ、isLoggedIn()がtrueになる
    liff.login();
    // リダイレクトが発生するため、ここには到達しない
    throw new Error('Redirecting to LINE login...');
  }
  return await liff.getProfile();
};

export const isLiffLoggedIn = (): boolean => {
  if (typeof liff === 'undefined') {
    return false;
  }
  return liff.isLoggedIn();
};

export const logout = () => {
  if (typeof liff !== 'undefined' && liff.isLoggedIn()) {
    liff.logout();
  }
};

export const isInLine = (): boolean => {
  return typeof liff !== 'undefined' && liff.isInClient();
};
