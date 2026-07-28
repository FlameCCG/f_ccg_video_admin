/**
 * Permission store tests
 * Tests for permission state management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import { usePermissionStore } from './permission'
import { getCurrentUserMenus, getUserPermissions } from '@/api/rbac'
import type { Menu } from '@/api/types'

// Mock the API module
vi.mock('@/api/rbac', () => ({
  getCurrentUserMenus: vi.fn(),
  getUserPermissions: vi.fn(),
}))

describe('permission store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    // Reset mocks
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty menus initially', () => {
      const store = usePermissionStore()
      expect(store.menus).toEqual([])
    })

    it('should have empty permissions initially', () => {
      const store = usePermissionStore()
      expect(store.permissions).toEqual([])
    })

    it('should have empty routes initially', () => {
      const store = usePermissionStore()
      expect(store.routes).toEqual([])
    })

    it('should not be loaded initially', () => {
      const store = usePermissionStore()
      expect(store.isLoaded).toBe(false)
    })

    it('should not be loading initially', () => {
      const store = usePermissionStore()
      expect(store.isLoading).toBe(false)
    })

    it('should have zh-CN as default locale', () => {
      const store = usePermissionStore()
      expect(store.currentLocale).toBe('zh-CN')
    })
  })

  describe('flatMenus computed', () => {
    it('should return empty array when no menus', () => {
      const store = usePermissionStore()
      expect(store.flatMenus).toEqual([])
    })
  })

  describe('permissionMap computed', () => {
    it('should return empty map when no permissions', () => {
      const store = usePermissionStore()
      expect(store.permissionMap.size).toBe(0)
    })
  })

  describe('setLocale', () => {
    it('should update current locale', () => {
      const store = usePermissionStore()
      store.setLocale('en-US')
      expect(store.currentLocale).toBe('en-US')
    })

    it('should accept ja-JP locale', () => {
      const store = usePermissionStore()
      store.setLocale('ja-JP')
      expect(store.currentLocale).toBe('ja-JP')
    })
  })

  describe('hasPermission', () => {
    it('should return false when no permissions', () => {
      const store = usePermissionStore()
      expect(store.hasPermission('/admin/user/list', 'GET')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('should return false when no permissions', () => {
      const store = usePermissionStore()
      expect(store.hasAnyPermission(['GET:/admin/user/list'])).toBe(false)
    })

    it('should return false for empty array', () => {
      const store = usePermissionStore()
      expect(store.hasAnyPermission([])).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('should return true for empty array', () => {
      const store = usePermissionStore()
      expect(store.hasAllPermissions([])).toBe(true)
    })

    it('should return false when no permissions', () => {
      const store = usePermissionStore()
      expect(store.hasAllPermissions(['GET:/admin/user/list'])).toBe(false)
    })
  })

  describe('getMenuById', () => {
    it('should return undefined when no menus', () => {
      const store = usePermissionStore()
      expect(store.getMenuById(1)).toBeUndefined()
    })
  })

  describe('getMenuByPath', () => {
    it('should return undefined when no menus', () => {
      const store = usePermissionStore()
      expect(store.getMenuByPath('/dashboard')).toBeUndefined()
    })
  })

  describe('resetPermission', () => {
    it('should reset all permission state', () => {
      const store = usePermissionStore()
      store.setLocale('en-US')
      store.resetPermission()

      expect(store.menus).toEqual([])
      expect(store.permissions).toEqual([])
      expect(store.routes).toEqual([])
      expect(store.isLoaded).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })

  describe('generateRoutes', () => {
    it('should return empty array when no menus', () => {
      const store = usePermissionStore()
      const routes = store.generateRoutes()
      expect(routes).toEqual([])
    })

    it('redirects a placeholder parent to its first sorted valid child', async () => {
      const store = usePermissionStore()
      const menus = [
        {
          id: 3,
          title: '社区治理',
          titleEn: 'Community Moderation',
          titleJa: 'コミュニティ管理',
          icon: '',
          path: '/community',
          name: 'Community',
          component: 'Layout',
          parentId: null,
          sortOrder: 3,
          children: [
            {
              id: 32,
              title: '评论管控',
              titleEn: 'Comment Moderation',
              titleJa: 'コメント管理',
              icon: '',
              path: 'comments',
              name: 'CommentModeration',
              component: 'views/community/comments/index.vue',
              parentId: 3,
              sortOrder: 2,
            },
            {
              id: 31,
              title: '举报处理',
              titleEn: 'Report Handling',
              titleJa: '通報対応',
              icon: '',
              path: 'reports',
              name: 'ReportHandling',
              component: 'views/community/reports/index.vue',
              parentId: 3,
              sortOrder: 1,
            },
          ],
        },
      ] satisfies Menu[]
      vi.mocked(getCurrentUserMenus).mockResolvedValue(menus)
      vi.mocked(getUserPermissions).mockResolvedValue([])

      await store.fetchUserPermissions(1)
      const [communityRoute] = store.routes

      expect(communityRoute?.redirect).toEqual({ name: 'ReportHandling' })
      expect(communityRoute?.children?.map((child) => child.name)).toEqual([
        'ReportHandling',
        'CommentModeration',
      ])

      const router = createRouter({
        history: createMemoryHistory(),
        routes: communityRoute ? [communityRoute] : [],
      })
      void router.push('/community')
      await router.isReady()
      expect(router.currentRoute.value.fullPath).toBe('/community/reports')
    })

    it('keeps an explicit backend redirect ahead of the automatic child redirect', async () => {
      const store = usePermissionStore()
      const menus = [
        {
          id: 3,
          title: '社区治理',
          titleEn: 'Community Moderation',
          titleJa: 'コミュニティ管理',
          icon: '',
          path: '/community',
          name: 'Community',
          component: 'Layout',
          parentId: null,
          sortOrder: 3,
          redirect: '/community/comments',
          children: [
            {
              id: 31,
              title: '举报处理',
              titleEn: 'Report Handling',
              titleJa: '通報対応',
              icon: '',
              path: 'reports',
              name: 'ReportHandling',
              component: 'views/community/reports/index.vue',
              parentId: 3,
              sortOrder: 1,
            },
          ],
        },
      ] satisfies Menu[]
      vi.mocked(getCurrentUserMenus).mockResolvedValue(menus)
      vi.mocked(getUserPermissions).mockResolvedValue([])

      await store.fetchUserPermissions(1)
      const [communityRoute] = store.routes

      expect(communityRoute?.redirect).toBe('/community/comments')
    })
  })
})
