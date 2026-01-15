/**
 * Auth store tests
 * Tests for authentication state management
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './auth'
import { STORAGE_KEYS } from '@/utils/storage'

// Mock the API module
vi.mock('@/api/auth', () => ({
  adminLogin: vi.fn(),
  refreshToken: vi.fn(),
}))

describe('auth store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    // Clear localStorage
    localStorage.clear()
    // Reset mocks
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have null tokens initially when localStorage is empty', () => {
      const store = useAuthStore()
      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
    })

    it('should not be logged in initially', () => {
      const store = useAuthStore()
      expect(store.isLoggedIn).toBe(false)
    })

    it('should not be logging in initially', () => {
      const store = useAuthStore()
      expect(store.isLoggingIn).toBe(false)
    })

    it('should not be refreshing initially', () => {
      const store = useAuthStore()
      expect(store.isRefreshing).toBe(false)
    })
  })

  describe('initAuth', () => {
    it('should restore tokens from localStorage', () => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'stored-access-token')
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'stored-refresh-token')

      const store = useAuthStore()
      store.initAuth()

      expect(store.accessToken).toBe('stored-access-token')
      expect(store.refreshToken).toBe('stored-refresh-token')
    })

    it('should be logged in after restoring valid token', () => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'valid-token')

      const store = useAuthStore()
      store.initAuth()

      expect(store.isLoggedIn).toBe(true)
    })
  })

  describe('logout', () => {
    it('should clear tokens', () => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access-token')
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token')

      const store = useAuthStore()
      store.initAuth()
      expect(store.isLoggedIn).toBe(true)

      store.logout()

      expect(store.accessToken).toBeNull()
      expect(store.refreshToken).toBeNull()
      expect(store.isLoggedIn).toBe(false)
    })

    it('should clear localStorage tokens', () => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'access-token')
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token')

      const store = useAuthStore()
      store.logout()

      expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull()
      expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull()
    })
  })

  describe('checkAuth', () => {
    it('should return false when no token', () => {
      const store = useAuthStore()
      expect(store.checkAuth()).toBe(false)
    })

    it('should return true when token exists', () => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'some-token')
      const store = useAuthStore()
      expect(store.checkAuth()).toBe(true)
    })
  })

  describe('isLoggedIn computed', () => {
    it('should be false when accessToken is null', () => {
      const store = useAuthStore()
      expect(store.isLoggedIn).toBe(false)
    })

    it('should be true when accessToken exists', () => {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'token')
      const store = useAuthStore()
      store.initAuth()
      expect(store.isLoggedIn).toBe(true)
    })
  })
})
