import { describe, expect, it } from 'vitest'
import {
  normalizeAIConfig,
  normalizeSiteConfig,
  normalizeThirdLoginConfig,
  normalizeTranscodeConfig,
} from './normalize'
import type { AIConfig, SiteConfig, ThirdLoginConfig, TranscodeConfig } from '@/api/types'

describe('site-config normalize', () => {
  it('strips removed AI URL fields and fills model lists', () => {
    const raw = {
      chatModelBaseURL: 'https://chat.example',
      chatModelAPIKey: 'k',
      chatModel: 'm',
      embeddingModel: 'emb',
      embeddingDimensions: 2048,
      doubaoModelAPIKey: 'dk',
      systemPrompt: 'hi',
      imageModel: 'img',
      videoModel: 'vid',
      vectorIndex: 'idx',
      vectorTopK: 8,
      maxInputWorks: 8,
      timeoutSec: 60,
      embeddingModelBaseURL: 'https://should-drop',
      doubaoBaseURL: 'https://should-drop-too',
    } as AIConfig & {
      embeddingModelBaseURL?: string
      doubaoBaseURL?: string
    }

    const next = normalizeAIConfig(raw)
    expect(next).not.toHaveProperty('embeddingModelBaseURL')
    expect(next).not.toHaveProperty('doubaoBaseURL')
    expect(next.imageModels).toEqual([])
    expect(next.videoModels).toEqual([])
    expect(next.chatModelBaseURL).toBe('https://chat.example')
  })

  it('fills missing high-tier transcode ratios', () => {
    const raw = {
      maxWorkers: 2,
      transcodeResolutions: [720],
      highBitrateThreshold: 8000,
      bitrate2160KbpsReduceRatio: 25,
      bitrate1080KbpsReduceRatio: 40,
      bitrate720KbpsReduceRatio: 55,
      bitrate360KbpsReduceRatio: 75,
      cpuMode: true,
      crfHigh: 18,
      crfMedium: 23,
      crf720: 24,
      crf360: 28,
      cpuPreset: 'medium',
      gpuCQPHigh: 18,
      gpuCQPMedium: 22,
      gpuCQP720: 24,
      gpuCQP360: 28,
      gpuPreset: 'p4',
      gpuMode: true,
      threads: 8,
      hardwareScale: false,
      mp4Enable: true,
      dashEnable: true,
      dashSegDuration: 4,
    } as TranscodeConfig

    const next = normalizeTranscodeConfig(raw)
    expect(next.bitrate2160HighKbpsReduceRatio).toBe(0)
    expect(next.bitrate1080HighKbpsReduceRatio).toBe(0)
    expect(next.mp4Enable).toBe(true)
  })

  it('fills empty third-login providers', () => {
    const next = normalizeThirdLoginConfig({} as ThirdLoginConfig)
    expect(next.qq).toEqual({ appID: '', appKey: '', redirect: '' })
    expect(next.google.clientID).toBe('')
    expect(next.x.redirect).toBe('')
  })

  it('fills site nested defaults', () => {
    const next = normalizeSiteConfig({} as SiteConfig)
    expect(next.contentReview.enable).toBe(false)
    expect(next.login.gitHubLogin).toBe(false)
    expect(next.register.slideCaptchaTTL).toBe(300)
    expect(next.defaultUserBannerIDs).toEqual([])
  })
})
