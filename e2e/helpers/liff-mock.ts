export const LIFF_MOCK_SCRIPT = `
  window.liff = {
    init: function() { return Promise.resolve(); },
    isLoggedIn: function() { return true; },
    login: function() {},
    logout: function() {},
    getProfile: function() {
      return Promise.resolve({
        userId: 'test_line_user_001',
        displayName: 'テスト太郎',
        pictureUrl: 'https://placehold.co/200x200',
        statusMessage: 'テスト',
      });
    },
    isInClient: function() { return false; },
    ready: Promise.resolve(),
    scanCodeV2: function() { return Promise.resolve({ value: '' }); },
    getContext: function() { return { type: 'utou' }; },
    getOS: function() { return 'web'; },
    getLineVersion: function() { return null; },
    getAccessToken: function() { return 'mock_access_token'; },
    getIDToken: function() { return 'mock_id_token'; },
    getDecodedIDToken: function() { return { sub: 'test_line_user_001' }; },
    sendMessages: function() { return Promise.resolve(); },
    openWindow: function() {},
    closeWindow: function() {},
    getFriendship: function() { return Promise.resolve({ friendFlag: true }); },
  };
`;

// For use in liff.setup.ts - returns the script as a string that can be used with addInitScript
export function getLiffMockScript(lineUserId?: string): string {
  const userId = lineUserId || process.env.TEST_LINE_USER_ID || 'test_line_user_001';
  return LIFF_MOCK_SCRIPT.replace(/test_line_user_001/g, userId);
}
