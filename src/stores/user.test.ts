/**
 * User store tests
 * Tests for user state management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from './user'

// Mock the API module
vi.mock('@/api/user', () => ({
  getUserInfo: vi.fn(),
  switchRole: vi.fn(),
}))

describe('user store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    // Reset mocks
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null userInfo initially', () => {
      const store = useUserStore()
      expect(store.userInfo).toBeNull()
    })

    it('should not be loading initially', () => {
      const store = useUserStore()
      expect(store.isLoading).toBe(false)
    })

    it('should not be loaded initially', () => {
      const store = useUserStore()
      expect(store.isLoaded).toBe(false)
    })
  })

  describe('computed properties', () => {
    it('should return 0 for userId when no user', () => {
      const store = useUserStore()
      expect(store.userId).toBe(0)
    })

    it('should return empty string for username when no user', () => {
      const store = useUserStore()
      expect(store.username).toBe('')
    })

    it('should return empty string for avatar when no user', () => {
      const store = useUserStore()
      expect(store.avatar).toBe('')
    })

    it('should return empty string for email when no user', () => {
      const store = useUserStore()
      expect(store.email).toBe('')
    })

    it('should return 0 for currentRoleId when no user', () => {
      const store = useUserStore()
      expect(store.currentRoleId).toBe(0)
    })

    it('should return empty array for roleNames when no user', () => {
      const store = useUserStore()
      expect(store.roleNames).toEqual([])
    })

    it('should return false for hasMultipleRoles when no user', () => {
      const store = useUserStore()
      expect(store.hasMultipleRoles).toBe(false)
    })
  })

  describe('updateUserInfo', () => {
    it('should not update when userInfo is null', () => {
      const store = useUserStore()
      store.updateUserInfo({ username: 'new-name' })
      expect(store.userInfo).toBeNull()
    })
  })

  describe('resetUser', () => {
    it('should reset all user state', () => {
      const store = useUserStore()
      // Manually set some state to test reset
      store.resetUser()

      expect(store.userInfo).toBeNull()
      expect(store.isLoaded).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })
})
