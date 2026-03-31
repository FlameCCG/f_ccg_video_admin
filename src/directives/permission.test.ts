/**
 * v-permission directive tests
 * Tests for permission directive functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { vPermission } from './permission'
import type { ObjectDirective } from 'vue'

// Mock the API module
vi.mock('@/api/rbac', () => ({
  getCurrentUserMenus: vi.fn(),
  getUserPermissions: vi.fn(),
}))

// Type assertion for the directive
type PermissionDirective = ObjectDirective<HTMLElement, unknown>

describe('v-permission directive', () => {
  let mockElement: HTMLElement
  let mockParentNode: HTMLElement
  const directive = vPermission as PermissionDirective

  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())

    // Create mock DOM elements
    mockParentNode = document.createElement('div')
    mockElement = document.createElement('button')
    mockParentNode.appendChild(mockElement)

    // Reset mocks
    vi.clearAllMocks()
  })

  describe('directive structure', () => {
    it('should have mounted hook', () => {
      expect(directive.mounted).toBeDefined()
      expect(typeof directive.mounted).toBe('function')
    })

    it('should have updated hook', () => {
      expect(directive.updated).toBeDefined()
      expect(typeof directive.updated).toBe('function')
    })
  })

  describe('mounted hook', () => {
    it('should not remove element when value is undefined', () => {
      const binding = {
        value: undefined,
        oldValue: undefined,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.mounted?.(mockElement, binding)

      // Element should still be in parent
      expect(mockParentNode.contains(mockElement)).toBe(true)
    })

    it('should remove element when no permission (array format)', () => {
      const binding = {
        value: ['GET:/admin/user/list'],
        oldValue: undefined,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.mounted?.(mockElement, binding)

      // Element should be removed (no permissions in store)
      expect(mockParentNode.contains(mockElement)).toBe(false)
    })

    it('should remove element when no permission (object format)', () => {
      const binding = {
        value: { resource: '/admin/user/ban', action: 'POST' },
        oldValue: undefined,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.mounted?.(mockElement, binding)

      // Element should be removed (no permissions in store)
      expect(mockParentNode.contains(mockElement)).toBe(false)
    })

    it('should remove element when no permission (multiple permissions format)', () => {
      const binding = {
        value: { permissions: ['GET:/admin/user/list', 'POST:/admin/user/ban'], all: true },
        oldValue: undefined,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.mounted?.(mockElement, binding)

      // Element should be removed (no permissions in store)
      expect(mockParentNode.contains(mockElement)).toBe(false)
    })
  })

  describe('updated hook', () => {
    it('should not re-check when value has not changed', () => {
      const value = ['GET:/admin/user/list']
      const binding = {
        value,
        oldValue: value,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.updated?.(mockElement, binding)

      // Element should still be in parent (no re-check)
      expect(mockParentNode.contains(mockElement)).toBe(true)
    })

    it('should re-check when value has changed', () => {
      const binding = {
        value: ['GET:/admin/user/list'],
        oldValue: ['POST:/admin/user/ban'],
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.updated?.(mockElement, binding)

      // Element should be removed (no permissions in store)
      expect(mockParentNode.contains(mockElement)).toBe(false)
    })
  })

  describe('permission checking logic', () => {
    it('should handle empty array permission', () => {
      const binding = {
        value: [],
        oldValue: undefined,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.mounted?.(mockElement, binding)

      // Empty array should result in no permission (hasAnyPermission returns false for empty)
      expect(mockParentNode.contains(mockElement)).toBe(false)
    })

    it('should handle multiple permissions with all=false', () => {
      const binding = {
        value: { permissions: ['GET:/admin/user/list'], all: false },
        oldValue: undefined,
        modifiers: {},
        dir: directive,
        instance: null,
      }

      // @ts-expect-error - Testing with partial binding
      directive.mounted?.(mockElement, binding)

      // Should check hasAnyPermission
      expect(mockParentNode.contains(mockElement)).toBe(false)
    })
  })
})
