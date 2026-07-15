/**
 * 站点统计与配置相关类型定义
 */

// ============ 站点配置类型 ============

/** 配置名称类型 */
export type SiteConfigName = 'site' | 'logger' | 'email' | 'ai' | 'transcode' | 'thirdLogin' | 'jwt'

// ============ 公开站点配置类型（无需认证） ============

/** 公开登录配置 */
export interface PublicLoginConfig {
  qqLogin: boolean
  xLogin: boolean
  googleLogin: boolean
  gitHubLogin: boolean
  linuxdoLogin: boolean
  usernamePwdLogin: boolean
  textGraphicCaptcha: boolean
  textClickCaptcha: boolean
  textClickCaptchaTTL: number
  textClickCaptchaPadding: number
}

/** 公开注册配置 */
export interface PublicRegisterConfig {
  emailCaptcha: boolean
  textGraphicCaptcha: boolean
  slideCaptcha: boolean
  slideCaptchaTTL: number
  slideCaptchaPadding: number
}

/** 公开存储配置 */
export interface PublicStorageConfig {
  maxChunkSize: number
  chunkSize: number
  maxFileSize: number
  maxUploadNum: number
}

/** 公开内容审核配置 */
export interface PublicContentReviewConfig {
  enable: boolean
}

/** 公开站点配置 */
export interface PublicSiteConfig {
  login: PublicLoginConfig
  register: PublicRegisterConfig
  storage: PublicStorageConfig
  contentReview: PublicContentReviewConfig
}

/** 公开配置响应 */
export interface PublicConfigResponse {
  site: PublicSiteConfig
}

// ============ 管理后台站点配置类型 ============

/** 内容审核配置 */
export interface ContentReviewConfig {
  enable: boolean
}

/** 登录配置 */
export interface LoginConfig {
  qqLogin: boolean
  xLogin: boolean
  googleLogin: boolean
  gitHubLogin: boolean
  linuxdoLogin: boolean
  usernamePwdLogin: boolean
  textGraphicCaptcha: boolean
  textClickCaptcha: boolean
  textClickCaptchaTTL: number
  textClickCaptchaPadding: number
}

/** 注册配置 */
export interface RegisterConfig {
  emailCaptcha: boolean
  textGraphicCaptcha: boolean
  slideCaptcha: boolean
  slideCaptchaTTL: number
  slideCaptchaPadding: number
}

/** 本地存储配置 */
export interface LocalStorageConfig {
  enable: boolean
  path: string
}

/** MinIO 存储配置 */
export interface MinioStorageConfig {
  userUploadPrefix: string
  enable: boolean
  endpoint: string
  accessKey: string
  secretKey: string
  bucket: string
  useSSL: boolean
  publicPrefixes: string[]
}

/** 存储配置 */
export interface StorageConfig {
  maxChunkSize: number
  chunkSize: number
  maxFileSize: number
  maxUploadNum: number
  chunkDir?: string
  local?: LocalStorageConfig
  minio?: MinioStorageConfig
}

/** 基础站点配置 */
export interface SiteConfig {
  /** 用户注册时主页默认横幅 ID */
  defaultUserBannerID: number
  /** 系统默认提供的用户主页横幅 ID 列表 */
  defaultUserBannerIDs: number[]
  contentReview: ContentReviewConfig
  login: LoginConfig
  register: RegisterConfig
  storage: StorageConfig
}

/** 日志配置 */
export interface LoggerConfig {
  debugFileName: string
  infoFileName: string
  warnFileName: string
  errorFileName: string
  enableConsole: boolean
  maxSize: number
  maxAge: number
  maxBackups: number
  development: boolean
}

/** 邮件配置 */
export interface EmailConfig {
  domain: string
  port: number
  sendEmail: string
  authCode: string
  sendNickName: string
  ssl: boolean
  tls: boolean
  isExpire: number
}

/** AI 配置（与后端 conf.AI 对齐；豆包图/视频/Embedding 走方舟默认 BaseURL） */
export interface AIModelOption {
  label: string
  value: string
}

export interface AIConfig {
  chatModelBaseURL: string
  chatModelAPIKey: string
  chatModel: string
  chatModels?: AIModelOption[]
  /** 是否开启思考模式（开启后前台可选择思考强度） */
  thinkingEnabled: boolean
  /** 默认思考强度 */
  thinkingEffort: string
  /** 可选思考强度列表 */
  thinkingEfforts?: AIModelOption[]
  embeddingModel: string
  embeddingDimensions: number
  doubaoModelAPIKey: string
  systemPrompt: string
  imageModel: string
  imageModels?: AIModelOption[]
  videoModel: string
  videoModels?: AIModelOption[]
  vectorIndex: string
  /** 向量召回 TopK，同时作为 AI 找视频注入候选上限 */
  vectorTopK: number
  timeoutSec: number
}

/** 转码配置（与后端 conf.Transcode 对齐） */
export interface TranscodeConfig {
  maxWorkers: number
  transcodeResolutions: number[]
  highBitrateThreshold: number
  /** 高码率档：4K 源片规范化 / DASH 2160 High */
  bitrate2160HighKbpsReduceRatio: number
  /** 高码率档：1080 High / 1080 源片规范化 */
  bitrate1080HighKbpsReduceRatio: number
  bitrate2160KbpsReduceRatio: number
  bitrate1080KbpsReduceRatio: number
  bitrate720KbpsReduceRatio: number
  bitrate360KbpsReduceRatio: number
  cpuMode: boolean
  crfHigh: number
  crfMedium: number
  crf720: number
  crf360: number
  cpuPreset: string
  gpuCQPHigh: number
  gpuCQPMedium: number
  gpuCQP720: number
  gpuCQP360: number
  gpuPreset: string
  gpuMode: boolean
  threads: number
  hardwareScale: boolean
  mp4Enable: boolean
  dashEnable: boolean
  dashSegDuration: number
}

/** QQ 登录配置 */
export interface QQLoginConfig {
  appID: string
  appKey: string
  redirect: string
}

/** 通用 OAuth 登录配置 */
export interface OAuthLoginConfig {
  clientID: string
  clientSecret: string
  redirect: string
}

/** 第三方登录配置 */
export interface ThirdLoginConfig {
  qq: QQLoginConfig
  google: OAuthLoginConfig
  github: OAuthLoginConfig
  linuxdo: OAuthLoginConfig
  x: OAuthLoginConfig
}

/** JWT 配置 */
export interface JwtConfig {
  accessExp: number
  refreshExp: number
  accessSecret: string
  refreshSecret: string
}

/** 配置类型映射 */
export interface SiteConfigMap {
  site: SiteConfig
  logger: LoggerConfig
  email: EmailConfig
  ai: AIConfig
  transcode: TranscodeConfig
  thirdLogin: ThirdLoginConfig
  jwt: JwtConfig
}

// ============ 站点统计类型 ============

/**
 * 趋势数据系列
 */
export interface TrendSeries {
  /** X 轴标签（日期） */
  x: string[]
  /** 数值 */
  values: number[]
  /** 变化率 */
  rates: number[]
}

/**
 * 站点概览数据
 */
export interface SiteOverview {
  /** 总用户数 */
  totalUsers: number
  /** 在线用户数 */
  onlineUsers: number
  /** 总视频数 */
  totalVideos: number
  /** 总评论数 */
  totalComments: number
  /** 今日登录用户数 */
  todayLoginUsers: number
  /** 今日注册用户数 */
  todayRegisters: number
}

/**
 * 每日趋势数据
 */
export interface DailyTrends {
  /** 访问用户趋势 */
  visitUsers: TrendSeries
  /** 发布视频趋势 */
  publishVideos: TrendSeries
  /** 新增用户趋势 */
  newUsers: TrendSeries
}

/**
 * 每月趋势数据
 */
export interface MonthlyTrends {
  /** 新增视频趋势 */
  newVideos: TrendSeries
}

/**
 * 站点统计数据
 */
export interface AdminSiteStats {
  /** 概览数据 */
  overview: SiteOverview
  /** 每日趋势 */
  daily: DailyTrends
  /** 每月趋势 */
  monthly: MonthlyTrends
}
