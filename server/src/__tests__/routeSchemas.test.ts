import {
  contractCreateSchema,
  ownerCreateSchema,
  ownerUpdateSchema,
  reservationUpdateSchema,
  storeUpdateSchema,
} from '../routes/schemas.js';

describe('route schemas', () => {
  it('normalizes owner create payload fields', () => {
    const result = ownerCreateSchema.safeParse({
      name: '  山田太郎  ',
      phone: ' 090-1234-5678 ',
      email: '',
      address: '  東京都 ',
      business_types: ['daycare', 'hotel', 'daycare'],
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      name: '山田太郎',
      phone: '090-1234-5678',
      email: null,
      address: '東京都',
      business_types: ['daycare', 'hotel'],
    });
  });

  it('accepts partial owner updates without requiring full payload', () => {
    const result = ownerUpdateSchema.safeParse({
      memo: '  メモ更新 ',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toEqual({ memo: 'メモ更新' });
  });

  it('maps legacy reservation status names to the current values', () => {
    const result = reservationUpdateSchema.safeParse({
      status: 'チェックイン済',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.status).toBe('登園済');
  });

  it('rejects store primary business type outside business_types', () => {
    const result = storeUpdateSchema.safeParse({
      business_types: ['daycare'],
      primary_business_type: 'hotel',
    });

    expect(result.success).toBe(false);
    if (result.success) return;

    expect(result.error.issues[0]?.message).toContain('primary_business_type');
  });

  it('parses contract create payload numeric fields', () => {
    const result = contractCreateSchema.safeParse({
      dog_id: '12',
      contract_type: 'チケット制',
      total_sessions: '8',
      remaining_sessions: '',
      price: '19800',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data).toMatchObject({
      dog_id: 12,
      contract_type: 'チケット制',
      total_sessions: 8,
      remaining_sessions: null,
      price: 19800,
    });
  });
});
