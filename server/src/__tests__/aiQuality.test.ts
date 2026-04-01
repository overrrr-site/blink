import { beforeEach, describe, expect, it, vi } from 'vitest'

const poolQueryMock = vi.fn()
const saveAILearningDataMock = vi.fn()
const getHighQualityExamplesMock = vi.fn()
const analyzeWritingStyleMock = vi.fn()
const callGeminiTextMock = vi.fn()
const callGeminiVisionMock = vi.fn()
const processBase64ImageMock = vi.fn()

vi.mock('../db/connection.js', () => ({
  default: { query: poolQueryMock },
}))

vi.mock('../utils/aiLearning.js', () => ({
  saveAILearningData: saveAILearningDataMock,
  getHighQualityExamples: getHighQualityExamplesMock,
  analyzeWritingStyle: analyzeWritingStyleMock,
}))

vi.mock('../services/ai/gemini.js', () => ({
  callGeminiText: callGeminiTextMock,
  callGeminiVision: callGeminiVisionMock,
  processBase64Image: processBase64ImageMock,
}))

const targetLengthText = '今日は落ち着いて過ごし、お友達との交流やスタッフとの関わりも楽しみながら一日を過ごしてくれました。トレーニングにも前向きに取り組み、できることが少しずつ増えてきています。食事やトイレも問題なく、安心して見守れる一日でした。声かけにも穏やかに反応してくれ、園での生活にしっかり慣れてきた様子が見られました。次回も成長した姿を楽しみにしています。'

describe('AI quality requirements', () => {
  beforeEach(() => {
    vi.resetModules()
    poolQueryMock.mockReset()
    saveAILearningDataMock.mockReset()
    getHighQualityExamplesMock.mockReset()
    analyzeWritingStyleMock.mockReset()
    callGeminiTextMock.mockReset()
    callGeminiVisionMock.mockReset()
    processBase64ImageMock.mockReset()
    process.env.GEMINI_API_KEY = 'test-key'
  })

  it('adds store-specific style hints and examples to daycare comment generation', async () => {
    analyzeWritingStyleMock.mockResolvedValue({
      avgLength: 230,
      usesEmoji: false,
      formalLevel: 'formal',
    })
    getHighQualityExamplesMock.mockResolvedValue([
      {
        inputContext: {},
        aiOutput: '以前の文例です。',
        finalText: 'いつも丁寧に一日の様子をお伝えする店舗文体の例です。',
      },
    ])
    callGeminiTextMock
      .mockResolvedValueOnce('元気でした。')
      .mockResolvedValueOnce(targetLengthText)

    const { generateDaycareComment } = await import('../services/aiService.js')
    const comment = await generateDaycareComment({
      dog_name: 'Pochi',
      memo: 'お昼寝後に元気が戻りました',
    }, 10)

    expect(callGeminiTextMock).toHaveBeenCalledTimes(2)
    expect(callGeminiTextMock.mock.calls[0]?.[0]?.prompt).toContain('この店舗の好みの文体')
    expect(callGeminiTextMock.mock.calls[0]?.[0]?.prompt).toContain('この店舗で好評だった過去の文例')
    expect(comment.length).toBeGreaterThanOrEqual(150)
    expect(comment.length).toBeLessThanOrEqual(250)
  })

  it('keeps generated reports within the 150-250 character requirement', async () => {
    callGeminiTextMock
      .mockResolvedValueOnce('短い報告です。')
      .mockResolvedValueOnce(targetLengthText)

    const { generateReport } = await import('../services/aiService.js')
    const result = await generateReport({
      record_type: 'daycare',
      dog_name: 'Pochi',
      daycare_data: {
        activities: ['freeplay'],
        training: { items: { sit: 'done' } },
        meal: { morning: '完食' },
        toilet: { morning: { urination: true, defecation: false } },
      },
      notes: { internal_notes: '落ち着いて過ごしていました' },
      photos: { regular: [], concerns: [] },
      condition: { overall: 'good' },
      health_check: {},
      tone: 'formal',
    } as never)

    expect(result.report.length).toBeGreaterThanOrEqual(150)
    expect(result.report.length).toBeLessThanOrEqual(250)
  })

  it('requests 150-250 characters in report prompts for all record types', async () => {
    const { buildReportPrompt } = await import('../services/ai/prompts.js')

    const daycarePrompt = buildReportPrompt('daycare', 'Pochi', {}, 'formal')
    const groomingPrompt = buildReportPrompt('grooming', 'Pochi', {}, 'formal')
    const hotelPrompt = buildReportPrompt('hotel', 'Pochi', {}, 'formal')

    expect(daycarePrompt).toContain('150〜250文字程度')
    expect(groomingPrompt).toContain('150〜250文字程度')
    expect(hotelPrompt).toContain('150〜250文字程度')
  })
})
