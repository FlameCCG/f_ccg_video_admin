import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { ref } from 'vue'
import { usePageTitle } from './usePageTitle'
import { usePermissionStore } from '@/stores/permission'

const mockRoute = { path: '/admin/user/list' }
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

const mockLocale = ref('zh-CN')
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: mockLocale,
  }),
}))

describe('usePageTitle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockRoute.path = '/admin/user/list'
    mockLocale.value = 'zh-CN'
  })

  it('should return empty title when menu is not found', () => {
    const permissionStore = usePermissionStore()
    permissionStore.getMenuByPath = vi.fn().mockReturnValue(null)

    const { pageTitle, currentMenu } = usePageTitle()
    expect(currentMenu.value).toBeNull()
    expect(pageTitle.value).toBe('')
  })

  it('should return localized title based on locale config', () => {
    const permissionStore = usePermissionStore()
    const mockMenu = {
      title: '用户管理',
      titleEn: 'User Management',
      titleJa: 'ユーザー管理',
    }
    permissionStore.getMenuByPath = vi.fn().mockReturnValue(mockMenu)

    const { pageTitle } = usePageTitle()

    // Test default/zh-CN
    expect(pageTitle.value).toBe('用户管理')

    // Test en-US
    mockLocale.value = 'en-US'
    expect(pageTitle.value).toBe('User Management')

    // Test ja-JP
    mockLocale.value = 'ja-JP'
    expect(pageTitle.value).toBe('ユーザー管理')
  })
})
