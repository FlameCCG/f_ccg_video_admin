/**
 * Storage utility tests
 * Tests for localStorage operations and token management
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEYS,
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  setTokens,
  clearTokens,
  hasToken,
} from './storage'

describe('storage utils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  describe('STORAGE_KEYS', () => {
    it('should have ACCESS_TOKEN key', () => {
      expect(STORAGE_KEYS.ACCESS_TOKEN).toBe('admin-console-access-token')
    })

    it('should have REFRESH_TOKEN key', () => {
      expect(STORAGE_KEYS.REFRESH_TOKEN).toBe('admin-console-refresh-token')
    })
  })

  describe('getStorageItem', () => {
    it('should return default value when key does not exist', () => {
      const result = getStorageItem('non-existent-key', 'default')
      expect(result).toBe('default')
    })

    it('should return stored value when key exists', () => {
      localStorage.setItem('test-key', JSON.stringify('stored-value'))
      const result = getStorageItem('test-key', 'default')
      expect(result).toBe('stored-value')
    })

    it('should return stored object when key exists', () => {
      const obj = { name: 'test', value: 123 }
      localStorage.setItem('test-obj', JSON.stringify(obj))
      const result = getStorageItem('test-obj', {})
      expect(result).toEqual(obj)
    })

    it('should return default value when JSON parse fails', () => {
      localStorage.setItem('invalid-json', 'not-valid-json')
      const result = getStorageItem('invalid-json', 'default')
      expect(result).toBe('default')
    })
  })

  describe('setStorageItem', () => {
    it('should store string value', () => {
      setStorageItem('test-key', 'test-value')
      expect(localStorage.getItem('test-key')).toBe('"test-value"')
    })

    it('should store object value', () => {
      const obj = { name: 'test', value: 123 }
      setStorageItem('test-obj', obj)
      expect(JSON.parse(localStorage.getItem('test-obj') || '')).toEqual(obj)
    })

    it('should store array value', () => {
      const arr = [1, 2, 3]
      setStorageItem('test-arr', arr)
      expect(JSON.parse(localStorage.getItem('test-arr') || '')).toEqual(arr)
    })

    it('should store boolean value', () => {
      setStorageItem('test-bool', true)
      expect(JSON.parse(localStorage.getItem('test-bool') || '')).toBe(true)
    })
  })

  describe('removeStorageItem', () => {
    it('should remove existing item', () => {
      localStorage.setItem('test-key', 'value')
      removeStorageItem('test-key')
      expect(localStorage.getItem('test-key')).toBeNull()
    })

    it('should not throw when removing non-existent item', () => {
      expect(() => removeStorageItem('non-existent')).not.toThrow()
    })
  })

  describe('Token operations', () => {
    describe('getAccessToken', () => {
      it('should return null when no token stored', () => {
        expect(getAccessToken()).toBeNull()
      })

      it('should return stored access token', () => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, 'test-access-token')
        expect(getAccessToken()).toBe('test-access-token')
      })
    })

    describe('setAccessToken', () => {
      it('should store access token', () => {
        setAccessToken('new-access-token')
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('new-access-token')
      })
    })

    describe('getRefreshToken', () => {
      it('should return null when no token stored', () => {
        expect(getRefreshToken()).toBeNull()
      })

      it('should return stored refresh token', () => {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'test-refresh-token')
        expect(getRefreshToken()).toBe('test-refresh-token')
      })
    })

    describe('setRefreshToken', () => {
      it('should store refresh token', () => {
        setRefreshToken('new-refresh-token')
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('new-refresh-token')
      })
    })

    describe('setTokens', () => {
      it('should store both access and refresh tokens', () => {
        setTokens('access-123', 'refresh-456')
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBe('access-123')
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBe('refresh-456')
      })
    })

    describe('clearTokens', () => {
      it('should remove both tokens', () => {
        setTokens('access', 'refresh')
        clearTokens()
        expect(localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)).toBeNull()
        expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull()
      })
    })

    describe('hasToken', () => {
      it('should return false when no access token', () => {
        expect(hasToken()).toBe(false)
      })

      it('should return true when access token exists', () => {
        setAccessToken('some-token')
        expect(hasToken()).toBe(true)
      })

      it('should return false when access token is empty string', () => {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, '')
        expect(hasToken()).toBe(false)
      })
    })
  })
})
