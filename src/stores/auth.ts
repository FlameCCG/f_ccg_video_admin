/**
 * 认证状态 Store
 * 管理 accessToken, refreshToken, 登录状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { adminLogin } from '@/api/auth'
import { authTokens, refreshTokens, isRefreshingTokens, syncAuthTokens } from '@/utils/authSession'
import { getAccessToken, setTokens, clearTokens, isTokenExpired } from '@/utils/storage'
import type { LoginCredentials, JwtToken } from '@/api/types'
import { useUserStore } from './user'
import { usePermissionStore } from './permission'

/**
 * 认证状态 Store
 */
export const useAuthStore = defineStore('auth', () => {
  // ==================== 状态 ====================

  /** 访问令牌 */
  syncAuthTokens()
  const accessToken = computed(() => authTokens.value.accessToken)

  /** 刷新令牌 */
  const refreshTokenValue = computed(() => authTokens.value.refreshToken)

  /** 是否正在登录 */
  const isLoggingIn = ref(false)

  /** 是否正在刷新 Token */
  const isRefreshing = isRefreshingTokens

  // ==================== 计算属性 ====================

  /** 是否已登录 */
  const isLoggedIn = computed(() => !!accessToken.value && !isTokenExpired(accessToken.value))

  // ==================== Actions ====================

  /**
   * 登录
   * @param credentials 登录凭证（包含滑块验证码信息）
   * @param options.silent 为 true 时不自动弹出错误 toast（滑块失败由组件内反馈）
   * @returns JWT Token
   */
  async function login(
    credentials: LoginCredentials,
    options?: { silent?: boolean }
  ): Promise<JwtToken> {
    isLoggingIn.value = true

    try {
      const result = await adminLogin(credentials, options?.silent ? { silent: true } : undefined)

      // 存储 Token
      useUserStore().resetUser()
      usePermissionStore().resetPermission()
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
    clearTokens()
    useUserStore().resetUser()
    usePermissionStore().resetPermission()
  }

  /**
   * 刷新 Token
   * @returns 新的 JWT Token
   */
  async function refreshAccessToken(): Promise<JwtToken> {
    return refreshTokens()
  }

  /**
   * 初始化认证状态
   * 从 localStorage 恢复 Token
   */
  function initAuth(): void {
    syncAuthTokens()
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
