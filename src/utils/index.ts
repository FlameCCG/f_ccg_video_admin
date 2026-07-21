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

// Vue Query 全局配置
export { createAppQueryClient, shouldRetryQuery } from './queryClient'

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
  isTokenExpired,
} from './storage'

// URL 相关
export { normalizeResourceUrl, normalizeExternalHref } from './url'

// 日期相关
export { formatDateTime } from './date'
