/**
 * 认证相关类型定义
 */

/**
 * 滑块验证码响应数据
 */
export interface SlideCaptcha {
  /** 主图片（Base64 或 URL） */
  masterImage: string
  /** 滑块图片（Base64 或 URL） */
  tileImage: string
  /** 验证 token */
  token: string
  /** 滑块 Y 坐标 */
  thumbY: number
}

/**
 * 点击验证码响应数据
 */
export interface ClickCaptcha {
  /** 主图片（Base64 或 URL） */
  masterImage: string
  /** 缩略图（Base64 或 URL） */
  thumbImage: string
  /** 验证 token */
  token: string
}

/**
 * 图形验证码响应数据
 */
export interface GraphicsCaptcha {
  /** 验证码 ID */
  captchaID: string
  /** Base64 编码的验证码图片 */
  captchaB64: string
}

/**
 * 滑块验证码验证参数
 */
export interface SlideCaptchaVerify {
  /** 滑块验证码 Token */
  slideCaptchaToken: string
  /** 滑块 X 坐标 */
  slideCaptchaX: number
  /** 滑块 Y 坐标 */
  slideCaptchaY: number
}

/**
 * 管理员登录凭证（滑块验证码参数可选，取决于后端配置）
 */
export interface LoginCredentials extends Partial<SlideCaptchaVerify> {
  /** 用户名或邮箱 */
  username: string
  /** 密码 */
  password: string
}

/**
 * JWT Token 响应
 */
export interface JwtToken {
  /** 访问令牌 */
  accessToken: string
  /** 刷新令牌 */
  refreshToken: string
}

/**
 * 刷新令牌请求参数
 */
export interface RefreshTokenParams {
  /** 刷新令牌 */
  refreshToken: string
}

/**
 * 图形验证码类型
 */
export type GraphicsCaptchaType = 1 | 2 | 3 | 4

/**
 * 邮箱验证码类型
 */
export type EmailCaptchaType = 1 | 2 | 3

/**
 * 发送邮箱验证码请求参数
 */
export interface SendEmailCaptchaParams extends SlideCaptchaVerify {
  /** 验证码类型（1注册 2重置密码 3绑定邮箱） */
  type: EmailCaptchaType
  /** 邮箱地址 */
  email: string
  /** 图形验证码 ID */
  captchaID: string
  /** 图形验证码 */
  captchaCode: string
}

/**
 * 邮箱验证码响应
 */
export interface EmailCaptchaResult {
  /** 邮箱验证码 ID */
  emailID: string
}
