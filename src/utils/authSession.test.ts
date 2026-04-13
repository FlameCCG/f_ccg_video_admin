import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import request, { setErrorMessageHandler } from './request'
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
  refreshTokens,
  setSessionExpiredHandler,
  ensureAccessToken,
} from './authSession'
import { useAuthStore } from '@/stores/auth'
import { getCaptchaFailureType } from './captchaError'

const token = (label: string, seconds = 3600, sid = 'admin-device') =>
  'header.' +
  btoa(
    JSON.stringify({ uid: '7', sid, jti: label, exp: Math.floor(Date.now() / 1000) + seconds })
  ) +
  '.signature'
const oldAT = token('old', -60)
const newAT = token('new')
const response = (config: AxiosRequestConfig, data: unknown): AxiosResponse => ({
  config: config as AxiosResponse['config'],
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
})
const ok = (config: AxiosRequestConfig, data: unknown) =>
  response(config, { code: 0, msg: 'ok', data })
const denied = (config: AxiosRequestConfig) =>
  response(config, { code: 1, msg: 'token invalid or account unavailable', data: {} })
const originalAdapter = axios.defaults.adapter
const originalRequestAdapter = request.defaults.adapter
const expired = vi.fn()

beforeEach(() => {
  localStorage.clear()
  clearTokens()
  setActivePinia(createPinia())
  setTokens(oldAT, 'rt-old')
  expired.mockClear()
  setSessionExpiredHandler(expired)
  setErrorMessageHandler(() => {})
})
afterEach(() => {
  axios.defaults.adapter = originalAdapter
  request.defaults.adapter = originalRequestAdapter
  clearTokens()
})

describe('admin token renewal', () => {
  it('preserves captcha messages and types for the login form', async () => {
    for (const [type, message] of [
      ['graphic', '图形验证码错误或已过期，请重新填写'],
      ['slide', '滑块验证码错误，请重新验证'],
      ['click', '文字点选验证码已过期，请重新验证'],
    ]) {
      request.defaults.adapter = (config) =>
        Promise.resolve(
          response(config, {
            code: 1,
            msg: message,
            data: { captchaType: type, captchaReason: 'invalid' },
          })
        )
      await expect(
        request.post('/admin/user/login/pwd', {}, { silent: true })
      ).rejects.toMatchObject({
        message,
        data: { captchaType: type },
      })
    }
    expect(getCaptchaFailureType(new Error('邮箱验证码发送太频繁'))).toBeNull()
  })
  it('recovers backend HTTP 200 authentication failures with one refresh and updates the store', async () => {
    let refreshes = 0
    const adapter: NonNullable<typeof axios.defaults.adapter> = async (config) => {
      if (config.url?.endsWith('/login/refresh')) {
        refreshes++
        await Promise.resolve()
        return ok(config, { accessToken: newAT, refreshToken: 'rt-new' })
      }
      return config.headers.get('Authorization') === 'Bearer ' + newAT
        ? ok(config, true)
        : denied(config)
    }
    axios.defaults.adapter = request.defaults.adapter = adapter
    const store = useAuthStore()
    expect(await Promise.all([request.get('/a'), request.get('/b'), request.get('/c')])).toEqual([
      true,
      true,
      true,
    ])
    expect(refreshes).toBe(1)
    expect(store.accessToken).toBe(newAT)
    expect(store.refreshToken).toBe('rt-new')
    expect(localStorage.getItem('admin-console-refresh-token')).toBe('rt-new')
  })

  it('bounds retries even when HTTP 401 persists after refreshing', async () => {
    let calls = 0,
      refreshes = 0
    axios.defaults.adapter = request.defaults.adapter = (config) => {
      if (config.url?.endsWith('/login/refresh')) {
        refreshes++
        return Promise.resolve(ok(config, { accessToken: newAT, refreshToken: 'rt-new' }))
      }
      calls++
      return Promise.reject(
        new AxiosError('unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
          ...denied(config),
          status: 401,
        })
      )
    }
    await expect(request.get('/private')).rejects.toThrow()
    expect(calls).toBe(2)
    expect(refreshes).toBe(1)
  })

  it('renews an expired AT before router login checks while RT remains valid', async () => {
    const store = useAuthStore()
    expect(store.isLoggedIn).toBe(false)
    axios.defaults.adapter = (config) =>
      Promise.resolve(ok(config, { accessToken: newAT, refreshToken: 'rt-new' }))
    expect(await ensureAccessToken()).toBe(newAT)
    expect(store.isLoggedIn).toBe(true)
  })

  it('uses the same refresh for a manual store refresh and an intercepted request', async () => {
    let refreshes = 0
    axios.defaults.adapter = request.defaults.adapter = async (config) => {
      if (config.url?.endsWith('/login/refresh')) {
        refreshes++
        await Promise.resolve()
        return ok(config, { accessToken: newAT, refreshToken: 'rt-new' })
      }
      return config.headers.get('Authorization') === 'Bearer ' + newAT
        ? ok(config, true)
        : denied(config)
    }
    const store = useAuthStore()
    await Promise.all([request.get('/private'), store.refreshAccessToken()])
    expect(refreshes).toBe(1)
  })

  it('rejects all waiters, clears credentials and notifies once when RT is invalid', async () => {
    axios.defaults.adapter = (config) => Promise.resolve(denied(config))
    const store = useAuthStore()
    const result = await Promise.allSettled([refreshTokens(), refreshTokens()])
    expect(result.every((item) => item.status === 'rejected')).toBe(true)
    expect(store.accessToken).toBeNull()
    expect(store.refreshToken).toBeNull()
    expect(expired).toHaveBeenCalledTimes(1)
  })

  it('preserves RT after a temporary network failure', async () => {
    axios.defaults.adapter = () => Promise.reject(new Error('offline'))
    await expect(refreshTokens()).rejects.toThrow('offline')
    expect(getRefreshToken()).toBe('rt-old')
    expect(expired).not.toHaveBeenCalled()
  })

  it('does not restore a logged-out session when an in-flight refresh completes', async () => {
    let finish!: () => void
    axios.defaults.adapter = (config) =>
      new Promise((resolve) => {
        finish = () => resolve(ok(config, { accessToken: newAT, refreshToken: 'rt-new' }))
      })
    const pending = refreshTokens()
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    clearTokens()
    finish()
    await expect(pending).rejects.toThrow('登录状态已变化')
    expect(getAccessToken()).toBeNull()
  })

  it('does not interpret captcha token or output token limits as authentication failures', async () => {
    let refreshes = 0
    axios.defaults.adapter = request.defaults.adapter = (config) => {
      if (config.url?.endsWith('/login/refresh')) refreshes++
      return Promise.resolve(
        response(config, { code: 1, msg: 'captcha token validation failed', data: {} })
      )
    }
    await expect(request.post('/admin/user/login/pwd', {})).rejects.toThrow()
    expect(refreshes).toBe(0)
  })
})

it('preserves credentials after business and HTTP storage failures and can retry', async () => {
  for (const msg of ['查询用户失败', '刷新令牌失败', 'unexpected service failure']) {
    axios.defaults.adapter = (config) =>
      Promise.resolve(response(config, { code: 1, msg, data: {} }))
    await expect(refreshTokens()).rejects.toThrow(msg)
    expect(getRefreshToken()).toBe('rt-old')
    expect(expired).not.toHaveBeenCalled()
  }
  axios.defaults.adapter = (config) =>
    Promise.reject(
      new AxiosError('unavailable', 'ERR_BAD_RESPONSE', config, undefined, {
        ...response(config, { code: 1, msg: '身份验证暂时不可用' }),
        status: 503,
      })
    )
  await expect(refreshTokens()).rejects.toThrow('unavailable')
  expect(getRefreshToken()).toBe('rt-old')
  axios.defaults.adapter = (config) =>
    Promise.resolve(ok(config, { accessToken: newAT, refreshToken: 'rt-new' }))
  expect((await refreshTokens()).refreshToken).toBe('rt-new')
})

it('retains the account rejection reason when ending a banned session', async () => {
  axios.defaults.adapter = (config) =>
    Promise.resolve(response(config, { code: 1, msg: 'account is banned', data: {} }))
  await expect(refreshTokens()).rejects.toMatchObject({
    name: 'SessionExpiredError',
    message: 'account is banned',
  })
  expect(getRefreshToken()).toBeNull()
  expect(expired).toHaveBeenCalledWith('account is banned')
})
