import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import axios from 'axios'
import { setupRouterGuard } from './guard'
import { clearTokens, setTokens, getRefreshToken } from '@/utils/authSession'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { getUserInfo } from '@/api/user'
import { getCurrentUserMenus, getUserPermissions } from '@/api/rbac'
import { setErrorMessageHandler, setLoginRedirectHandler } from '@/utils/request'
import type { AdminUserInfo } from '@/api/types'

vi.mock('@/api/user', () => ({ getUserInfo: vi.fn() }))
vi.mock('@/api/rbac', () => ({ getCurrentUserMenus: vi.fn(), getUserPermissions: vi.fn() }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ currentLocale: 'zh-CN' }) }))
vi.mock('./routes', () => ({ WHITE_LIST_ROUTES: ['/login', '/403', '/404'] }))

const token = (expired: boolean) =>
  'header.' +
  btoa(
    JSON.stringify({
      uid: '7',
      sid: 'device',
      exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600),
    })
  ) +
  '.signature'
const routerForTest = () => {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: ['/', '/private', '/login'].map((path) => ({
      path,
      component: { template: '<div />' },
      meta: { requiresAuth: false },
    })),
  })
  setupRouterGuard(router)
  return router
}
const showError = vi.fn()
const redirect = vi.fn()
const user = (id = 7) => ({ id, username: `admin-${id}` }) as AdminUserInfo

beforeEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
  clearTokens()
  setActivePinia(createPinia())
  setErrorMessageHandler(showError)
  setLoginRedirectHandler(redirect)
  showError.mockClear()
  redirect.mockClear()
  vi.mocked(getUserInfo).mockReset().mockResolvedValue(user())
  vi.mocked(getCurrentUserMenus).mockReset().mockResolvedValue([])
  vi.mocked(getUserPermissions).mockReset().mockResolvedValue([])
})

describe('router token recovery', () => {
  it('restores expired AT with RT before deciding to redirect to login', async () => {
    setTokens(token(true), 'valid-rt')
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: { code: 0, data: { accessToken: token(false), refreshToken: 'new-rt' } },
    })
    const router = routerForTest()
    await router.push('/private')
    expect(router.currentRoute.value.path).toBe('/private')
    expect(post).toHaveBeenCalledTimes(1)
  })

  it('redirects to login only when renewal fails and keeps the destination', async () => {
    setTokens(token(true), 'invalid-rt')
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { code: 1, data: {} } })
    const router = routerForTest()
    await router.push('/private')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/private')
  })

  it('does not redirect the login page to itself when renewal fails', async () => {
    setTokens(token(true), 'invalid-rt')
    const post = vi.spyOn(axios, 'post').mockRejectedValue(new Error('offline'))
    const router = routerForTest()
    await router.push('/login')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(post).toHaveBeenCalledTimes(1)
  })

  for (const stage of ['profile', 'menus', 'permissions'] as const) {
    it(`keeps renewed credentials and clears incomplete state when ${stage} fails`, async () => {
      setTokens(token(true), 'old-rt')
      vi.spyOn(axios, 'post').mockResolvedValue({
        data: { code: 0, data: { accessToken: token(false), refreshToken: 'renewed-rt' } },
      })
      const failure = new Error('temporarily unavailable')
      if (stage === 'profile') vi.mocked(getUserInfo).mockRejectedValueOnce(failure)
      if (stage === 'menus') vi.mocked(getCurrentUserMenus).mockRejectedValueOnce(failure)
      if (stage === 'permissions') vi.mocked(getUserPermissions).mockRejectedValueOnce(failure)
      const router = routerForTest()
      await router.push('/private')
      expect(getRefreshToken()).toBe('renewed-rt')
      expect(useUserStore().isLoaded).toBe(false)
      expect(useUserStore().userId).toBe(0)
      expect(usePermissionStore().isLoaded).toBe(false)
      expect(redirect).not.toHaveBeenCalled()

      setTokens(token(false), 'other-admin-rt')
      vi.mocked(getUserInfo).mockResolvedValueOnce(user(8))
      await router.push('/private')
      expect(useUserStore().userId).toBe(8)
      expect(getUserPermissions).toHaveBeenLastCalledWith({ userId: 8 })
      expect(router.currentRoute.value.path).toBe('/private')
    })
  }

  it('uses the production expiration callback to show the ban reason and navigate once', async () => {
    setTokens(token(true), 'banned-rt')
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { code: 1, msg: 'account is banned' } })
    const router = routerForTest()
    const replace = vi.spyOn(router, 'replace')
    const destinations: string[] = []
    router.afterEach((to) => destinations.push(to.path))
    await router.push('/private')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(showError).toHaveBeenCalledExactlyOnceWith('account is banned')
    expect(redirect).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(destinations).toEqual(['/login'])
    expect(getRefreshToken()).toBeNull()
  })
})
