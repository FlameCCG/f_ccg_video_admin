/**
 * 工具函数统一导出
 */

// 请求相关
export {
  request,
  tokenRefresher,
  BusinessError,
  setErrorMessageHandler,
  setLoginRedirectHandler,
  type ApiResponse,
} from './request'

// 存储相关
export {
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
