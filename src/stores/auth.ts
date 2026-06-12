/**
 * 认证状态 Store
 * 管理 accessToken, refreshToken, 登录状态
 * Requirements: 4.1, 4.5
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminLogin, refreshToken as refreshTokenApi } from '@/api/auth'
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from '@/utils/storage'
import type { LoginCredentials, JwtToken } from '@/api/types'

/**
 * 认证状态 Store
 */
export const useAuthStore = defineStore('auth', () => {
  // ==================== 状态 ====================

  /** 访问令牌 */
  const accessToken = ref<string | null>(getAccessToken())

  /** 刷新令牌 */
  const refreshTokenValue = ref<string | null>(getRefreshToken())

  /** 是否正在登录 */
  const isLoggingIn = ref(false)

  /** 是否正在刷新 Token */
  const isRefreshing = ref(false)

  // ==================== 计算属性 ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!accessToken.value && !isTokenExpired(accessToken.value))

  // ==================== Actions ====================

  /**
   * 登录
   * @param credentials 登录凭证（包含滑块验证码信息）
   * @returns JWT Token
   */
  async function login(credentials: LoginCredentials): Promise<JwtToken> {
    isLoggingIn.value = true

    try {
      const result = await adminLogin(credentials)

      // 存储 Token
      accessToken.value = result.accessToken
      refreshTokenValue.value = result.refreshToken
      setTokens(result.accessToken, result.refreshToken)

      return result
    } finally {
      isLoggingIn.value = false
    }
  }

  /**
   * 退出登录
   */
  function logout(): void {
    // 清除状态
    accessToken.value = null
    refreshTokenValue.value = null

    // 清除存储
    clearTokens()
  }

  /**
   * 刷新 Token
   * @returns 新的 JWT Token
   */
  async function refreshAccessToken(): Promise<JwtToken> {
    const currentRefreshToken = refreshTokenValue.value || getRefreshToken()

    if (!currentRefreshToken) {
      throw new Error('No refresh token available')
    }

    isRefreshing.value = true

    try {
      const result = await refreshTokenApi({ refreshToken: currentRefreshToken })

      // 更新 Token
      accessToken.value = result.accessToken
      refreshTokenValue.value = result.refreshToken
      setTokens(result.accessToken, result.refreshToken)

      return result
    } catch (error) {
      // 刷新失败，清除登录状态
      logout()
      throw error
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * 初始化认证状态
   * 从 localStorage 恢复 Token
   */
  function initAuth(): void {
    accessToken.value = getAccessToken()
    refreshTokenValue.value = getRefreshToken()
  }

  /**
   * 检查是否有有效的 Token
   */
  function checkAuth(): boolean {
    const token = getAccessToken()
    return !!token && !isTokenExpired(token)
  }

  return {
    // 状态
    accessToken: computed(() => accessToken.value),
    refreshToken: computed(() => refreshTokenValue.value),
    isLoggedIn,
    isLoggingIn: computed(() => isLoggingIn.value),
    isRefreshing: computed(() => isRefreshing.value),

    // Actions
    login,
    logout,
    refreshAccessToken,
    initAuth,
    checkAuth,
  }
})
