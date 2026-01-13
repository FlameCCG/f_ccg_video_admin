/**
 * 认证相关 API
 * Requirements: 4.1
 */
import request from '@/utils/request'
import type { SlideCaptcha, LoginCredentials, JwtToken, RefreshTokenParams } from './types'

/**
 * 获取滑块验证码
 * GET /common/captcha/slide
 */
export function getSlideCaptcha(): Promise<SlideCaptcha> {
  return request.get('/common/captcha/slide')
}

/**
 * 管理员登录
 * POST /admin/user/login/pwd
 */
export function adminLogin(params: LoginCredentials): Promise<JwtToken> {
  return request.post('/admin/user/login/pwd', params)
}

/**
 * 刷新访问令牌
 * POST /common/user/login/refresh
 */
export function refreshToken(params: RefreshTokenParams): Promise<JwtToken> {
  return request.post('/common/user/login/refresh', params)
}
