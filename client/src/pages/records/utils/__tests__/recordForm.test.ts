import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildCreateRecordPayload,
  buildUpdateRecordPayload,
  validateRecordForm,
  type RecordFormPayloadInput,
} from '../recordForm'

const baseInput: RecordFormPayloadInput = {
  recordType: 'daycare',
  daycareData: {
    training: {
      items: {},
    },
  },
  groomingData: {
    selectedParts: [],
    partNotes: {},
    counseling: {
      style_request: '',
      caution_notes: '',
      condition_notes: '',
      consent_confirmed: false,
    },
  },
  hotelData: {
    check_in: '',
    check_out_scheduled: '',
    nights: 1,
    care_logs: [],
  },
  photos: {
    regular: [],
    concerns: [],
  },
  notes: {
    internal_notes: null,
    report_text: null,
  },
  condition: null,
  healthCheck: null,
}

describe('recordForm', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-13T09:15:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('buildCreateRecordPayload keeps current create payload contract', () => {
    const payload = buildCreateRecordPayload({
      ...baseInput,
      dogId: 10,
      reservationId: '99',
      status: 'saved',
      recordType: 'daycare',
      daycareData: {
        training: {
          items: { sit: 'done' },
          note: '集中できた',
        },
      },
      photos: {
        regular: [{ id: 'p-1', url: 'https://example.com/1.jpg', uploadedAt: '2026-02-13T09:00:00.000Z' }],
        concerns: [],
      },
      notes: {
        internal_notes: 'メモ',
        report_text: '今日も元気でした',
      },
    })

    expect(payload).toMatchObject({
      dog_id: 10,
      reservation_id: 99,
      record_type: 'daycare',
      record_date: '2026-02-13',
      status: 'saved',
      daycare_data: {
        training: {
          items: { sit: 'done' },
          note: '集中できた',
        },
      },
      notes: {
        internal_notes: 'メモ',
        report_text: '今日も元気でした',
      },
    })
    expect(payload.grooming_data).toBeUndefined()
    expect(payload.hotel_data).toBeUndefined()
    expect(payload.photos?.regular).toEqual([
      { id: 'p-1', url: 'https://example.com/1.jpg', uploadedAt: '2026-02-13T09:00:00.000Z' },
    ])
  })

  it('buildUpdateRecordPayload keeps current update payload contract', () => {
    const photos = {
      regular: [{ id: 'p-2', url: 'https://example.com/2.jpg', uploadedAt: '2026-02-13T09:00:00.000Z' }],
      concerns: [],
    }
    const payload = buildUpdateRecordPayload({
      ...baseInput,
      recordType: 'grooming',
      groomingData: {
        selectedParts: ['body'],
        partNotes: { body: '3mm' },
        counseling: {
          style_request: '短め',
          caution_notes: '',
          condition_notes: '良好',
          consent_confirmed: true,
        },
      },
      photos,
      notes: {
        internal_notes: '特記事項なし',
        report_text: 'トリミングしました',
      },
    })

    expect(payload).toMatchObject({
      grooming_data: {
        selectedParts: ['body'],
        partNotes: { body: '3mm' },
      },
      notes: {
        internal_notes: '特記事項なし',
        report_text: 'トリミングしました',
      },
    })
    expect(payload.daycare_data).toBeUndefined()
    expect(payload.hotel_data).toBeUndefined()
    expect(payload.status).toBeUndefined()
    expect(payload.photos).toBe(photos)
  })

  it('validateRecordForm keeps current share validation rules', () => {
    const validation = validateRecordForm({
      ...baseInput,
      recordType: 'grooming',
      groomingData: {
        selectedParts: [],
        partNotes: {},
        counseling: {
          style_request: '',
          caution_notes: '',
          condition_notes: '',
          consent_confirmed: false,
        },
      },
      photos: { regular: [], concerns: [] },
      notes: { internal_notes: null, report_text: '短い文' },
    }, 'share')

    expect(validation.ok).toBe(false)
    expect(validation.errors).toEqual([
      'カット部位を1つ以上選択してください',
      '希望スタイルを入力してください',
      '当日の体調確認を入力してください',
      'カウンセリング確認チェックをオンにしてください',
      '写真を1枚以上追加してください',
      '報告文を10文字以上入力してください',
    ])
  })

  it('validateRecordForm allows save when current required fields are filled', () => {
    const validation = validateRecordForm({
      ...baseInput,
      recordType: 'daycare',
      daycareData: {
        training: {
          items: { sit: 'done' },
        },
      },
      photos: {
        regular: [{ id: 'p-3', url: 'https://example.com/3.jpg', uploadedAt: '2026-02-13T09:00:00.000Z' }],
        concerns: [],
      },
      notes: {
        internal_notes: null,
        report_text: '今日は集中してトレーニングできました。',
      },
    }, 'save')

    expect(validation).toEqual({ ok: true, errors: [] })
  })
})
