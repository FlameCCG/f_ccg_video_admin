import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePermission } from './usePermission'
import { usePermissionStore } from '@/stores/permission'

describe('usePermission', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should delegate permission check methods to permissionStore', () => {
    const store = usePermissionStore()
    store.hasPermission = vi.fn().mockReturnValue(true)
    store.hasAnyPermission = vi.fn().mockReturnValue(false)
    store.hasAllPermissions = vi.fn().mockReturnValue(true)

    const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission()

    expect(hasPermission('/res', 'GET')).toBe(true)
    expect(store.hasPermission).toHaveBeenCalledWith('/res', 'GET')

    expect(hasAnyPermission(['GET:/res'])).toBe(false)
    expect(store.hasAnyPermission).toHaveBeenCalledWith(['GET:/res'])

    expect(hasAllPermissions(['GET:/res'])).toBe(true)
    expect(store.hasAllPermissions).toHaveBeenCalledWith(['GET:/res'])
  })

  it('should delegate menus, isLoaded, and isLoading computed properties', () => {
    const store = usePermissionStore()

    // Set some properties using Object.defineProperty for read-only computed properties
    Object.defineProperty(store, 'menus', {
      get: () => [{ id: 1, title: 'Menu', path: '/menu' }],
      configurable: true,
    })
    Object.defineProperty(store, 'isLoaded', {
      get: () => true,
      configurable: true,
    })
    Object.defineProperty(store, 'isLoading', {
      get: () => false,
      configurable: true,
    })

    const { menus, isLoaded, isLoading } = usePermission()

    expect(menus.value).toEqual([{ id: 1, title: 'Menu', path: '/menu' }])
    expect(isLoaded.value).toBe(true)
    expect(isLoading.value).toBe(false)
  })
})
