import request from '@/utils/request'
import type { ClickCaptcha, GraphicsCaptcha } from './types'

export type CaptchaType = 'none' | 'click' | 'slide'
export type CaptchaScene = 'login' | 'register'
export interface ClickCaptchaResult {
  token: string
  dots: { index: number; x: number; y: number }[]
}

export const getCaptchaType = (scene: CaptchaScene): Promise<{ type: CaptchaType }> =>
  request.get('/common/captcha/type', { params: { scene }, silent: true })

export const getClickCaptcha = (): Promise<ClickCaptcha> =>
  request.get('/common/captcha/click', { params: { scene: 'login' } })

export const getGraphicsCaptcha = (): Promise<GraphicsCaptcha> =>
  request.get('/common/captcha/graphics-text', { silent: true })
