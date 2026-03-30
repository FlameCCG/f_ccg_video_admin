/**
 * Utils index exports tests
 * Tests for utility module exports
 */
import { describe, it, expect } from 'vitest'
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
  BusinessError,
  setErrorMessageHandler,
  setLoginRedirectHandler,
} from './index'

describe('utils index exports', () => {
  describe('storage exports', () => {
    it('should export STORAGE_KEYS', () => {
      expect(STORAGE_KEYS).toBeDefined()
      expect(STORAGE_KEYS.ACCESS_TOKEN).toBeDefined()
      expect(STORAGE_KEYS.REFRESH_TOKEN).toBeDefined()
    })

    it('should export storage functions', () => {
      expect(typeof getStorageItem).toBe('function')
      expect(typeof setStorageItem).toBe('function')
      expect(typeof removeStorageItem).toBe('function')
    })

    it('should export token functions', () => {
      expect(typeof getAccessToken).toBe('function')
      expect(typeof setAccessToken).toBe('function')
      expect(typeof getRefreshToken).toBe('function')
      expect(typeof setRefreshToken).toBe('function')
      expect(typeof setTokens).toBe('function')
      expect(typeof clearTokens).toBe('function')
      expect(typeof hasToken).toBe('function')
    })
  })

  describe('request exports', () => {
    it('should export BusinessError class', () => {
      expect(BusinessError).toBeDefined()
      const error = new BusinessError(1, 'Test error')
      expect(error.code).toBe(1)
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('BusinessError')
    })

    it('should export handler setters', () => {
      expect(typeof setErrorMessageHandler).toBe('function')
      expect(typeof setLoginRedirectHandler).toBe('function')
    })
  })
})
