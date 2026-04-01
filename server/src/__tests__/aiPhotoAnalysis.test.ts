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

describe('photo analysis inputs', () => {
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

  it('analyzes grooming photos when only photo data URL is provided', async () => {
    processBase64ImageMock.mockReturnValue({
      base64Data: 'abc123',
      mimeType: 'image/jpeg',
    })
    callGeminiVisionMock.mockResolvedValue(JSON.stringify({
      summary: '耳まわりに軽い赤みがあります。',
      concerns: [{ area: '耳', issue: '赤み', severity: 'medium' }],
      overall_health: '注意',
    }))

    const { analyzePhotoForRecord } = await import('../services/aiService.js')
    const result = await analyzePhotoForRecord({
      record_type: 'grooming',
      photo: 'data:image/jpeg;base64,abc123',
      dog_name: 'Pochi',
    })

    expect(processBase64ImageMock).toHaveBeenCalledWith('data:image/jpeg;base64,abc123')
    expect(callGeminiVisionMock).toHaveBeenCalled()
    expect(result.health_concerns).toEqual([
      { area: '耳', issue: '赤み', severity: 'medium' },
    ])
    expect(result.suggestion).toEqual(expect.objectContaining({
      type: 'photo-concern',
      payload: expect.objectContaining({
        photoUrl: 'data:image/jpeg;base64,abc123',
      }),
    }))
  })

  it('supports activity analysis when photo is provided without photo_base64', async () => {
    processBase64ImageMock.mockReturnValue({
      base64Data: 'xyz789',
      mimeType: 'image/png',
    })
    callGeminiVisionMock.mockResolvedValue('オスワリの練習に集中しながら、楽しそうに過ごしていました。')

    const { analyzePhotoForActivity } = await import('../services/aiService.js')
    const result = await analyzePhotoForActivity({
      photo: 'data:image/png;base64,xyz789',
      dog_name: 'Pochi',
    })

    expect(processBase64ImageMock).toHaveBeenCalledWith('data:image/png;base64,xyz789')
    expect(callGeminiVisionMock).toHaveBeenCalled()
    expect(result.training_suggestions).toContain('sit')
    expect(result.suggested_comment).toContain('オスワリ')
  })
})
