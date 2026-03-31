/**
 * Permission store tests
 * Tests for permission state management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePermissionStore } from './permission'

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
  })
})
