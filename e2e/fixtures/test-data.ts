export const TEST_STORE = {
  name: 'E2Eテスト店舗',
  address: '東京都渋谷区テスト1-2-3',
  businessTypes: ['daycare', 'grooming', 'hotel'] as const,
  primaryBusinessType: 'daycare' as const,
};

export const TEST_STAFF = {
  email: process.env.TEST_STAFF_EMAIL || 'e2e-staff@test.blink.pet',
  password: process.env.TEST_STAFF_PASSWORD || 'TestPassword123!',
  name: 'E2Eテスト管理者',
};

export const TEST_OWNER = {
  name: 'テスト飼い主太郎',
  nameKana: 'テストカイヌシタロウ',
  phone: process.env.TEST_OWNER_PHONE || '09000000001',
  email: 'e2e-owner@test.blink.pet',
  lineUserId: process.env.TEST_LINE_USER_ID || 'test_line_user_001',
};

export const TEST_DOGS = [
  {
    name: 'テスト犬ポチ',
    breed: 'トイプードル',
    gender: 'male' as const,
    birthDate: '2022-06-15',
    weight: 4.5,
    color: 'レッド',
    neutered: true,
  },
  {
    name: 'テスト犬モモ',
    breed: '柴犬',
    gender: 'female' as const,
    birthDate: '2023-01-20',
    weight: 8.0,
    color: '赤',
    neutered: false,
  },
];
