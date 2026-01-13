/**
 * 本地存储工具
 * 提供类型安全的 localStorage 操作
 */

// 存储 key 常量
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'admin-console-access-token',
  REFRESH_TOKEN: 'admin-console-refresh-token',
} as const

/**
 * 获取存储值
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key)
    if (item === null) return defaultValue
    return JSON.parse(item) as T
  } catch {
    return defaultValue
  }
}

/**
 * 设置存储值
 */
export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储失败时静默处理
  }
}

/**
 * 移除存储值
 */
export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // 移除失败时静默处理
  }
}

// ==================== Token 存储操作 ====================

/**
 * 获取 Access Token
 */
export function getAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
}

/**
 * 设置 Access Token
 */
export function setAccessToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token)
}

/**
 * 获取 Refresh Token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)
}

/**
 * 设置 Refresh Token
 */
export function setRefreshToken(token: string): void {
  localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token)
}

/**
 * 设置 Token（同时设置 access 和 refresh）
 */
export function setTokens(accessToken: string, refreshToken: string): void {
  setAccessToken(accessToken)
  setRefreshToken(refreshToken)
}

/**
 * 清除所有 Token
 */
export function clearTokens(): void {
  removeStorageItem(STORAGE_KEYS.ACCESS_TOKEN)
  removeStorageItem(STORAGE_KEYS.REFRESH_TOKEN)
}

/**
 * 检查是否有 Token
 */
export function hasToken(): boolean {
  return !!getAccessToken()
}
