/**
 * 配置加载归一化：补齐缺省嵌套结构，剥离后端已移除字段，避免保存时写零/崩溃。
 */
import type {
  AIConfig,
  AIModelOption,
  OAuthLoginConfig,
  QQLoginConfig,
  SiteConfig,
  ThirdLoginConfig,
  TranscodeConfig,
} from '@/api/types'

function emptyOAuth(): OAuthLoginConfig {
  return { clientID: '', clientSecret: '', redirect: '' }
}

function emptyQQ(): QQLoginConfig {
  return { appID: '', appKey: '', redirect: '' }
}

function normalizeModelList(list: AIModelOption[] | undefined | null): AIModelOption[] {
  if (!Array.isArray(list)) return []
  return list.map((item) => ({
    label: item?.label ?? '',
    value: item?.value ?? '',
  }))
}

/** 剥离后端已删除的 AI 旧字段，并补齐可选列表 */
export function normalizeAIConfig(raw: AIConfig): AIConfig {
  // 丢弃已移除字段，避免 PUT 时写回 yaml
  const legacy = { ...(raw as unknown as Record<string, unknown>) }
  delete legacy.embeddingModelBaseURL
  delete legacy.doubaoBaseURL
  delete legacy.baseURL
  delete legacy.apiKey
  delete legacy.textModel
  delete legacy.maxInputWorks
  const rest = legacy as unknown as AIConfig

  return {
    chatModelBaseURL: rest.chatModelBaseURL ?? '',
    chatModelAPIKey: rest.chatModelAPIKey ?? '',
    chatModel: rest.chatModel ?? '',
    chatModels: normalizeModelList(rest.chatModels),
    thinkingEnabled: rest.thinkingEnabled ?? false,
    thinkingEffort: rest.thinkingEffort ?? '',
    thinkingEfforts: normalizeModelList(rest.thinkingEfforts),
    embeddingModel: rest.embeddingModel ?? '',
    embeddingDimensions: rest.embeddingDimensions ?? 0,
    doubaoModelAPIKey: rest.doubaoModelAPIKey ?? '',
    systemPrompt: rest.systemPrompt ?? '',
    menuGenerationSystemPrompt: rest.menuGenerationSystemPrompt ?? '',
    imageModel: rest.imageModel ?? '',
    imageModels: normalizeModelList(rest.imageModels),
    videoModel: rest.videoModel ?? '',
    videoModels: normalizeModelList(rest.videoModels),
    vectorIndex: rest.vectorIndex ?? '',
    vectorTopK: rest.vectorTopK ?? 0,
    timeoutSec: rest.timeoutSec ?? 0,
  }
}

export function normalizeTranscodeConfig(raw: TranscodeConfig): TranscodeConfig {
  return {
    maxWorkers: raw.maxWorkers ?? 1,
    transcodeResolutions: Array.isArray(raw.transcodeResolutions) ? raw.transcodeResolutions : [],
    highBitrateThreshold: raw.highBitrateThreshold ?? 0,
    bitrate2160HighKbpsReduceRatio: raw.bitrate2160HighKbpsReduceRatio ?? 0,
    bitrate1080HighKbpsReduceRatio: raw.bitrate1080HighKbpsReduceRatio ?? 0,
    bitrate2160KbpsReduceRatio: raw.bitrate2160KbpsReduceRatio ?? 0,
    bitrate1080KbpsReduceRatio: raw.bitrate1080KbpsReduceRatio ?? 0,
    bitrate720KbpsReduceRatio: raw.bitrate720KbpsReduceRatio ?? 0,
    bitrate360KbpsReduceRatio: raw.bitrate360KbpsReduceRatio ?? 0,
    cpuMode: raw.cpuMode ?? false,
    crfHigh: raw.crfHigh ?? 0,
    crfMedium: raw.crfMedium ?? 0,
    crf720: raw.crf720 ?? 0,
    crf360: raw.crf360 ?? 0,
    cpuPreset: raw.cpuPreset ?? '',
    gpuCQPHigh: raw.gpuCQPHigh ?? 0,
    gpuCQPMedium: raw.gpuCQPMedium ?? 0,
    gpuCQP720: raw.gpuCQP720 ?? 0,
    gpuCQP360: raw.gpuCQP360 ?? 0,
    gpuPreset: raw.gpuPreset ?? '',
    gpuMode: raw.gpuMode ?? false,
    threads: raw.threads ?? 0,
    hardwareScale: raw.hardwareScale ?? false,
    mp4Enable: raw.mp4Enable ?? false,
    dashEnable: raw.dashEnable ?? false,
    dashSegDuration: raw.dashSegDuration ?? 4,
  }
}

export function normalizeThirdLoginConfig(raw: ThirdLoginConfig): ThirdLoginConfig {
  return {
    qq: raw.qq ? { ...emptyQQ(), ...raw.qq } : emptyQQ(),
    google: raw.google ? { ...emptyOAuth(), ...raw.google } : emptyOAuth(),
    github: raw.github ? { ...emptyOAuth(), ...raw.github } : emptyOAuth(),
    linuxdo: raw.linuxdo ? { ...emptyOAuth(), ...raw.linuxdo } : emptyOAuth(),
    x: raw.x ? { ...emptyOAuth(), ...raw.x } : emptyOAuth(),
  }
}

export function normalizeSiteConfig(raw: SiteConfig): SiteConfig {
  return {
    defaultUserBannerID: raw.defaultUserBannerID ?? 0,
    defaultUserBannerIDs: Array.isArray(raw.defaultUserBannerIDs) ? raw.defaultUserBannerIDs : [],
    contentReview: {
      enable: raw.contentReview?.enable ?? false,
    },
    login: {
      qqLogin: raw.login?.qqLogin ?? false,
      xLogin: raw.login?.xLogin ?? false,
      googleLogin: raw.login?.googleLogin ?? false,
      gitHubLogin: raw.login?.gitHubLogin ?? false,
      linuxdoLogin: raw.login?.linuxdoLogin ?? false,
      usernamePwdLogin: raw.login?.usernamePwdLogin ?? false,
      textGraphicCaptcha: raw.login?.textGraphicCaptcha ?? false,
      textClickCaptcha: raw.login?.textClickCaptcha ?? false,
      textClickCaptchaTTL: raw.login?.textClickCaptchaTTL ?? 300,
      textClickCaptchaPadding: raw.login?.textClickCaptchaPadding ?? 20,
    },
    register: {
      emailCaptcha: raw.register?.emailCaptcha ?? false,
      textGraphicCaptcha: raw.register?.textGraphicCaptcha ?? false,
      slideCaptcha: raw.register?.slideCaptcha ?? false,
      slideCaptchaTTL: raw.register?.slideCaptchaTTL ?? 300,
      slideCaptchaPadding: raw.register?.slideCaptchaPadding ?? 10,
    },
    storage: {
      maxChunkSize: raw.storage?.maxChunkSize ?? 0,
      chunkSize: raw.storage?.chunkSize ?? 0,
      maxFileSize: raw.storage?.maxFileSize ?? 0,
      maxUploadNum: raw.storage?.maxUploadNum ?? 0,
      chunkDir: raw.storage?.chunkDir ?? '',
      local: raw.storage?.local
        ? {
            enable: raw.storage.local.enable ?? false,
            path: raw.storage.local.path ?? '',
          }
        : undefined,
      minio: raw.storage?.minio
        ? {
            userUploadPrefix: raw.storage.minio.userUploadPrefix ?? '',
            enable: raw.storage.minio.enable ?? false,
            endpoint: raw.storage.minio.endpoint ?? '',
            accessKey: raw.storage.minio.accessKey ?? '',
            secretKey: raw.storage.minio.secretKey ?? '',
            bucket: raw.storage.minio.bucket ?? '',
            useSSL: raw.storage.minio.useSSL ?? false,
            publicPrefixes: Array.isArray(raw.storage.minio.publicPrefixes)
              ? raw.storage.minio.publicPrefixes
              : [],
          }
        : undefined,
    },
  }
}
